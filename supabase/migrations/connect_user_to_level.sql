CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."user" (auth_id, user_name, user_level)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username', 1);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;