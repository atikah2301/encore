-- Wishlist kanban stage tracking: where a show sits on the not-running -> planned
-- production -> tickets-available -> booked timeline. Only meaningful pre-seen, same
-- idiom as `position`/`booking_url` (see migrations README). `booked` is tracked
-- separately from `wishlist_status` since a booked show may still have no on-sale
-- date recorded (e.g. a preview/press night ticket bought ahead of general sale) -
-- the kanban column is booked ? 'booked' : wishlist_status.
alter table encore.shows
  add column wishlist_status text not null default 'none'
    check (wishlist_status in ('none', 'announced', 'on_sale')),
  add column on_sale_date date,
  add column booked boolean not null default false,
  add column booked_date date,
  add column booked_companions text;
