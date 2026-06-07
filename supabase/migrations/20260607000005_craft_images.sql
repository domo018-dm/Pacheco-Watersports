-- Set image_url for each craft to the static assets served from /public/crafts/.
-- Replace with Supabase Storage URLs once real equipment photos are available.
update crafts set image_url = '/crafts/ski-thunder.jpg' where id = 'ski-thunder';
update crafts set image_url = '/crafts/ski-bolt.jpg'    where id = 'ski-bolt';
update crafts set image_url = '/crafts/ski-rapid.jpg'   where id = 'ski-rapid';
update crafts set image_url = '/crafts/ski-blaze.jpg'   where id = 'ski-blaze';
update crafts set image_url = '/crafts/boat-mesa.jpg'   where id = 'boat-mesa';
update crafts set image_url = '/crafts/boat-wake.jpg'   where id = 'boat-wake';
