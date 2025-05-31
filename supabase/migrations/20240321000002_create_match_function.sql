CREATE OR REPLACE FUNCTION public.create_match(p1_id UUID, p2_id UUID)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_session_id UUID;
    new_lobby_id UUID;
    existing_match RECORD;
    error_message TEXT;
BEGIN
    -- Check if either player is already in a match
    SELECT l.id, l.game_session_id 
    INTO existing_match
    FROM game_lobbies l
    JOIN game_lobby_players lp ON l.id = lp.lobby_id
    WHERE l.status IN ('waiting', 'starting', 'in_progress')
    AND lp.user_id IN (p1_id, p2_id)
    LIMIT 1;

    IF FOUND THEN
        RETURN json_build_object(
            'error', 'Player already in a match',
            'lobby_id', existing_match.id,
            'session_id', existing_match.game_session_id
        );
    END IF;

    -- Start transaction
    BEGIN
        -- Remove both players from waiting list
        DELETE FROM waiting_players
        WHERE user_id IN (p1_id, p2_id);

        -- Create new game session
        BEGIN
            INSERT INTO game_sessions (game_type, user_id, total_questions)
            VALUES ('multiplayer', p1_id, 10)
            RETURNING id INTO new_session_id;
        EXCEPTION WHEN OTHERS THEN
            error_message := 'Error creating game session: ' || SQLERRM;
            RAISE EXCEPTION '%', error_message;
        END;

        -- Create new lobby
        BEGIN
            INSERT INTO game_lobbies (
                host_id,
                status,
                max_players,
                current_players,
                game_session_id
            )
            VALUES (
                p1_id,
                'in_progress',
                2,
                2,
                new_session_id
            )
            RETURNING id INTO new_lobby_id;
        EXCEPTION WHEN OTHERS THEN
            error_message := 'Error creating lobby: ' || SQLERRM;
            RAISE EXCEPTION '%', error_message;
        END;

        -- Add both players to the lobby
        BEGIN
            INSERT INTO game_lobby_players (lobby_id, user_id)
            VALUES 
                (new_lobby_id, p1_id),
                (new_lobby_id, p2_id);
        EXCEPTION WHEN OTHERS THEN
            error_message := 'Error adding players to lobby: ' || SQLERRM;
            RAISE EXCEPTION '%', error_message;
        END;

        -- Return the new lobby and session IDs
        RETURN json_build_object(
            'success', true,
            'lobby_id', new_lobby_id,
            'session_id', new_session_id
        );
    EXCEPTION WHEN OTHERS THEN
        -- Return detailed error message
        RETURN json_build_object(
            'success', false,
            'error', COALESCE(error_message, SQLERRM)
        );
    END;
END;
$$; 