import React, { useState } from 'react';

export default function Lobby(){
    const [isReady, setIsReady] = useState(false);

    const handleReadyToggle = () => {
        setIsReady(!isReady);
    };

    return (
        <div className="lobby">
            <h2>Lobby</h2>

            <button onClick={handleReadyToggle}>
                {isReady ? 'Unready' : 'Ready'}
            </button>

        </div>
    );
};
