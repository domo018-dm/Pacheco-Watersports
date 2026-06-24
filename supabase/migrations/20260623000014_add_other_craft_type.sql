-- Allow 'other' as a craft type (vehicles, equipment, recreational gear, etc.)
alter table crafts drop constraint if exists crafts_type_check;
alter table crafts add constraint crafts_type_check check (type in ('ski', 'boat', 'other'));
