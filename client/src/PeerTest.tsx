import React, { useState } from 'react';
import { peersToTest } from "./reuse/static"
interface StunServer {
    urls: string;
    username?: string;
    credential?: string;
}

async function testStunServer(stunServer: StunServer): Promise<boolean> {
    return new Promise((resolve) => {
        const pc = new RTCPeerConnection({
            iceServers: [stunServer]
        });

        pc.createDataChannel('test');

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                resolve(true); // STUN server is working
                pc.close();
            }
        };

        pc.onicecandidateerror = () => {
            resolve(false); // STUN server is not working
            pc.close();
        };

        pc.createOffer().then(offer => pc.setLocalDescription(offer));

        // Timeout after 5 seconds
        setTimeout(() => {
            resolve(false);
            pc.close();
        }, 5000);
    });
}

async function getAvailableStunServers(servers: StunServer[]): Promise<StunServer[]> {
    const availableServers: StunServer[] = [];
    for (const server of servers) {
        const isWorking = await testStunServer(server);
        if (isWorking) {
            availableServers.push(server);
        }
    }
    return availableServers;
}

const StunServerTester: React.FC = () => {
    const [serverStatus, setServerStatus] = useState<{ [key: string]: boolean | null }>({});
    const [availableServers, setAvailableServers] = useState<StunServer[]>([]);

    const testServers = async () => {
        const results: { [key: string]: boolean | null } = {};
        for (const server of peersToTest.iceServers) {
            results[server.urls] = null; // Set initial status to null (testing)
            setServerStatus({ ...results });
            const isWorking = await testStunServer(server);
            results[server.urls] = isWorking;
            setServerStatus({ ...results });
        }
    };

    const findAvailableServers = async () => {
        const available = await getAvailableStunServers(peersToTest.iceServers);
        setAvailableServers(available);
    };
    return (
        <div>
            <h1>STUN Server Tester</h1>
            <button onClick={testServers}>Test STUN Servers</button>
            <ul>
                {peersToTest.iceServers.map(server => (
                    <li key={server.urls}>
                        {server.urls}: {serverStatus[server.urls] === null ? 'Testing...' : serverStatus[server.urls] ? 'Working' : 'Not Working'}
                    </li>
                ))}
            </ul>
            <h1>total  {peersToTest.iceServers.length}</h1>
            <button onClick={findAvailableServers}>Find Available STUN Servers</button>
            {availableServers.length > 0 && (
                <div>
                    <h2>Available STUN Servers</h2>
                    <ul>
                        {availableServers.map(server => (
                            <li key={server.urls}>{server.urls}</li>
                        ))}
                    </ul>
                </div>
            )}
            <h2>available{availableServers.length}</h2>
        </div>
    );
};

export default StunServerTester;
