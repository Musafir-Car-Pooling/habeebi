ALTER TABLE public.profile_private ADD COLUMN gender text;
ALTER TABLE public.profiles ADD COLUMN avatar_path text;
ALTER TABLE public.profile_private ADD CONSTRAINT gender_values CHECK (gender IS NULL OR gender IN ('male','female','other','prefer_not_to_say'));
ALTER TABLE public.profiles ADD CONSTRAINT avatar_owner_path CHECK (avatar_path IS NULL OR avatar_path ~ ('^' || id::text || '/[a-zA-Z0-9_-]+\.(webp|jpg)$'));
CREATE OR REPLACE FUNCTION public.validate_private_details() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT nullif(raw_user_meta_data->>'gender','') INTO NEW.gender FROM auth.users WHERE id = NEW.id;
  END IF;
  IF (TG_OP = 'INSERT' OR NEW.phone IS DISTINCT FROM OLD.phone) AND NEW.phone <> '' AND NEW.phone !~ '^\+9715[024568][0-9]{7}$' THEN
    RAISE EXCEPTION 'Enter a valid UAE mobile number: +971 followed by 9 digits';
  END IF;
  IF NEW.gender IS NOT NULL AND NEW.gender NOT IN ('male','female','other','prefer_not_to_say') THEN RAISE EXCEPTION 'Invalid gender'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_private_details BEFORE INSERT OR UPDATE ON public.profile_private FOR EACH ROW EXECUTE FUNCTION public.validate_private_details();
ALTER POLICY "req del" ON public.service_requests USING ((citizen_id = auth.uid() AND status = 'cancelled') OR public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS requests_citizen_created ON public.service_requests(citizen_id, created_at DESC);
CREATE INDEX IF NOT EXISTS requests_provider_created ON public.service_requests(provider_id, created_at DESC);
CREATE INDEX IF NOT EXISTS requests_open_category_created ON public.service_requests(category_id, created_at DESC) WHERE status = 'open';
CREATE INDEX IF NOT EXISTS reviews_citizen ON public.reviews(citizen_id);
CREATE POLICY "avatar upload owner" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text AND lower(storage.extension(name)) IN ('webp','jpg'));
CREATE POLICY "avatar read profile audience" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'avatars' AND ((storage.foldername(name))[1] = auth.uid()::text OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.avatar_path = objects.name)));
CREATE POLICY "avatar delete owner" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);