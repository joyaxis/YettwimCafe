-- Enable extensions
create extension if not exists "pgcrypto";

-- Tables
create table if not exists menu_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price numeric not null,
  category text,
  image_url text,
  recipe text,
  is_hidden boolean not null default false,
  is_hot boolean not null default false,
  is_ice boolean not null default false,
  created_at timestamptz default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  sort_order integer not null default 0,
  created_at timestamptz default now()
);

create table if not exists inventory_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  name text not null,
  qty integer not null default 0,
  price numeric not null default 0,
  created_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_code text unique,
  status text not null default '주문요청',
  subtotal numeric not null default 0,
  discount numeric not null default 0,
  total numeric not null default 0,
  pickup_time text,
  note text,
  customer_token uuid,
  customer_name text,
  created_at timestamptz default now()
);

create sequence if not exists order_code_seq;

create or replace function generate_order_code()
returns text language plpgsql as $$
declare
  seq_val integer;
begin
  select nextval('order_code_seq') into seq_val;
  return 'ORD-' || lpad(seq_val::text, 5, '0');
end;
$$;

create or replace function set_order_code()
returns trigger language plpgsql as $$
begin
  if new.order_code is null then
    new.order_code := generate_order_code();
  end if;
  return new;
end;
$$;

drop trigger if exists orders_set_code on orders;
create trigger orders_set_code
before insert on orders
for each row
execute function set_order_code();

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  menu_item_id uuid references menu_items(id),
  name text not null,
  qty integer not null,
  price numeric not null,
  status text not null default '주문요청',
  recipe text
);

create table if not exists order_status_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  order_item_id uuid references order_items(id) on delete cascade,
  entity_type text not null check (entity_type in ('order', 'item')),
  from_status text,
  to_status text not null,
  created_at timestamptz default now()
);

-- RLS
alter table menu_items enable row level security;
alter table categories enable row level security;
alter table inventory_items enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table order_status_events enable row level security;
-- storage objects are protected by storage policies

-- Policies
create policy "menu items read" on menu_items
  for select using (true);

-- Admin helper condition:
-- (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'

create policy "menu items manage" on menu_items
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "categories read" on categories
  for select using (true);

create policy "categories manage" on categories
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "inventory manage" on inventory_items
  for all to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "orders insert" on orders
  for insert to authenticated
  with check (
    auth.uid() = customer_token
    or (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
-- if customer_token is text, use: auth.uid()::text = customer_token

create policy "orders read" on orders
  for select to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
    or customer_token = auth.uid()
  );
-- if customer_token is text, use: customer_token = auth.uid()::text

create policy "orders read by name" on orders
  for select to authenticated
  using (true);

create policy "orders update" on orders
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "orders delete" on orders
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "order items insert" on order_items
  for insert to authenticated
  with check (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or
    exists (
      select 1
      from orders
      where orders.id = order_items.order_id
        and orders.customer_token = auth.uid()
    )
  );
-- if orders.customer_token is text, use: orders.customer_token = auth.uid()::text

create policy "order items read" on order_items
  for select to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or
    exists (
      select 1
      from orders
      where orders.id = order_items.order_id
        and orders.customer_token = auth.uid()
    )
  );
-- if orders.customer_token is text, use: orders.customer_token = auth.uid()::text

create policy "order items read by name" on order_items
  for select to authenticated
  using (true);

create policy "order items update" on order_items
  for update to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "order items delete" on order_items
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "order events read" on order_status_events
  for select to authenticated
  using (
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin' or
    exists (
      select 1
      from orders
      where orders.id = order_status_events.order_id
        and orders.customer_token = auth.uid()
    )
  );
-- if orders.customer_token is text, use: orders.customer_token = auth.uid()::text

create policy "order events read by name" on order_status_events
  for select to authenticated
  using (true);

create policy "order events insert" on order_status_events
  for insert to authenticated
  with check ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

create policy "order events delete" on order_status_events
  for delete to authenticated
  using ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- Storage bucket for menu images (public read, admin write)
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

create policy "menu images read"
on storage.objects
for select
using (bucket_id = 'menu-images');

create policy "menu images write"
on storage.objects
for all to authenticated
using (
  bucket_id = 'menu-images'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
)
with check (
  bucket_id = 'menu-images'
  and (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
);
