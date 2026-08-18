-- BUILD 11 data retirement: keep the historical prototype data, but stop
-- presenting the original Malaga workspace as an active product trip.

UPDATE public.trip
SET status = 'archived'
WHERE id = 'e7977afa-93ea-4a9c-a9da-de9c305e5860'::uuid
  AND status <> 'archived';
