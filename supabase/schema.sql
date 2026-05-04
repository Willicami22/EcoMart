-- EcoMart: esquema + RLS (ejecutar en SQL Editor de Supabase)
-- Usa solo anon key en el frontend; nunca la service_role.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid (),
  name text not null,
  price numeric(12, 2) not null check (price >= 0),
  image_url text,
  category text not null
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid (),
  user_id uuid not null references auth.users (id) on delete cascade,
  total numeric(12, 2) not null check (total >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid (),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete restrict,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0)
);

-- Proyectos ya creados sin unit_price: añadir, rellenar desde catálogo y endurecer NOT NULL
alter table public.order_items
  add column if not exists unit_price numeric(12, 2);

update public.order_items oi
set
  unit_price = p.price
from
  public.products p
where
  oi.product_id = p.id
  and oi.unit_price is null;

alter table public.order_items alter column unit_price set not null;

create index if not exists orders_user_id_created_at_idx on public.orders (user_id, created_at desc);
create index if not exists order_items_order_id_idx on public.order_items (order_id);
create index if not exists products_category_idx on public.products (category);

-- ---------------------------------------------------------------------------
-- Perfil automático al registrarse (security definer; bypass RLS)
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users for each row
execute procedure public.handle_new_user ();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- profiles: cada usuario solo ve/edita su fila
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid () = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid () = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid () = id) with check (auth.uid () = id);

-- products: lectura pública (catálogo sin login)
drop policy if exists "products_select_all" on public.products;
create policy "products_select_all" on public.products
  for select using (true);

-- orders: solo propias
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select using (auth.uid () = user_id);

-- Sin INSERT directo: solo create_order_from_cart (SECURITY DEFINER + transacción)
drop policy if exists "orders_insert_own" on public.orders;
drop policy if exists "order_items_insert_own" on public.order_items;

-- order_items: solo lectura de líneas de pedidos propios
drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.user_id = auth.uid ()
    )
  );

-- ---------------------------------------------------------------------------
-- Crear pedido: total y unit_price desde catálogo (el cliente no manda importe)
-- ---------------------------------------------------------------------------

create or replace function public.create_order_from_cart (items jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid ();
  new_order_id uuid;
  computed_total numeric(12, 2);
  missing_product boolean;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;

  if items is null or jsonb_typeof(items) != 'array' or jsonb_array_length(items) = 0 then
    raise exception 'items must be a non-empty json array';
  end if;

  if exists (
    select
      1
    from
      jsonb_array_elements(items) elem
    where
      (elem ->> 'product_id') is null
      or (elem ->> 'quantity') is null
      or ((elem ->> 'quantity')::integer) <= 0
  ) then
    raise exception 'each item needs product_id and a positive quantity';
  end if;

  with
    lines as (
      select
        (elem ->> 'product_id')::uuid as product_id,
        ((elem ->> 'quantity')::integer) as quantity
      from
        jsonb_array_elements(items) elem
    ),
    agg as (
      select
        product_id,
        sum(quantity)::integer as quantity
      from
        lines
      group by
        product_id
    )
  select
    exists (
      select
        1
      from
        agg a
      where
        not exists (
          select
            1
          from
            public.products p
          where
            p.id = a.product_id
        )
    ),
    coalesce(
      (
        select
          sum(p.price * a.quantity)::numeric(12, 2)
        from
          agg a
          join public.products p on p.id = a.product_id
      ),
      0
    )
  into
    missing_product,
    computed_total;

  if missing_product then
    raise exception 'unknown product_id';
  end if;

  insert into public.orders (user_id, total)
  values (uid, computed_total)
  returning
    id into new_order_id;

  insert into public.order_items (order_id, product_id, quantity, unit_price)
  select
    new_order_id,
    a.product_id,
    a.quantity,
    p.price
  from
    (
      select
        (elem ->> 'product_id')::uuid as product_id,
        sum((elem ->> 'quantity')::integer)::integer as quantity
      from
        jsonb_array_elements(items) elem
      group by
        (elem ->> 'product_id')::uuid
    ) a
    join public.products p on p.id = a.product_id;

  return new_order_id;
end;
$$;

revoke all on function public.create_order_from_cart (jsonb) from PUBLIC;

grant execute on function public.create_order_from_cart (jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Datos de ejemplo (opcional)
-- ---------------------------------------------------------------------------

insert into public.products (name, price, image_url, category)
values
  (
    'Botella reutilizable acero',
    24.99,
    'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&q=80',
    'Hogar'
  ),
  (
    'Bolsa de compras de algodón',
    12.50,
    'https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=400&q=80',
    'Hogar'
  ),
  (
    'Cepillo de bambú',
    6.99,
    'https://images.unsplash.com/photo-1607613009820-a29f7bb81c04?w=400&q=80',
    'Cuidado personal'
  ),
  (
    'Jabón artesanal ecológico',
    8.75,
    'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=400&q=80',
    'Cuidado personal'
  ),
  (
    'Utensilios de cocina madera',
    32.00,
    'https://images.unsplash.com/photo-1556911220-bff31c812dba?w=400&q=80',
    'Cocina'
  ),
  (
    'Compostera doméstica',
    89.00,
    'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400&q=80',
    'Jardín'
  );

-- Permisos mínimos (RLS sigue aplicando)
grant usage on schema public to anon, authenticated;
grant select on public.products to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.orders to authenticated;
grant select on public.order_items to authenticated;

revoke insert on table public.orders from authenticated;

revoke insert on table public.order_items from authenticated;
