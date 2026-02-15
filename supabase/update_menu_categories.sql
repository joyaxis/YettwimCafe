-- Map menu_items.category to the canonical name in categories
-- This normalizes case/whitespace by matching on lower(trim(name)).

update menu_items m
set category = c.name
from categories c
where lower(trim(m.category)) = lower(trim(c.name));

-- Optional: set category to NULL if it doesn't match any category
-- update menu_items
-- set category = null
-- where category is not null
--   and lower(trim(category)) not in (select lower(trim(name)) from categories);
