CREATE OR REPLACE FUNCTION public.validate_private_details() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT nullif(raw_user_meta_data->>'gender','') INTO NEW.gender FROM auth.users WHERE id = NEW.id;
    IF NEW.phone <> '' AND (NEW.phone !~ '^\+9715[024568][0-9]{7}$' OR NEW.gender IS NULL) THEN
      RAISE EXCEPTION 'Select gender and enter a valid UAE mobile number';
    END IF;
  ELSIF NEW.phone IS DISTINCT FROM OLD.phone AND NEW.phone !~ '^\+9715[024568][0-9]{7}$' THEN
    RAISE EXCEPTION 'Enter a valid UAE mobile number: +971 followed by 9 digits';
  END IF;
  IF NEW.gender IS NOT NULL AND NEW.gender NOT IN ('male','female','other','prefer_not_to_say') THEN RAISE EXCEPTION 'Invalid gender'; END IF;
  RETURN NEW;
END $$;