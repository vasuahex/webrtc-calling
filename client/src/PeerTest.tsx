import React, { useState } from 'react';
import { getTooltipStyle, peersToTest } from "./reuse/static"
import Button from './reuse/Button';
import Button2 from './reuse/Button2';
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

        pc.onicegatheringstatechange = () => {
            if (pc.iceGatheringState === 'complete') {
                resolve(false); // No candidates were gathered
                pc.close();
            }
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
    const styles = getTooltipStyle("right");
    return (
        <div className='flex p-5'>
            <div>
                <h1>STUN Server Tester</h1>
                <Button text='Test STUN Servers' onClick={testServers} styles={styles} tooltipText='Testing Button' />
                <h1>total  {peersToTest.iceServers.length}</h1>
                <Button2 isLoading={false} text='text-btn' type='button' styles={styles} tooltipText='sample btn' />
                <ul>
                    {peersToTest.iceServers.map(server => (
                        <li key={server.urls}>
                            {server.urls}: {serverStatus[server.urls] === null ? 'Testing...' : serverStatus[server.urls] ? 'Working' : 'Not Working'}
                        </li>
                    ))}
                </ul>
            </div>
            <div>
                <Button text='Find Available STUN Servers' onClick={findAvailableServers} styles={styles} tooltipText='Available Servers ' />
                <h2>available{availableServers.length}</h2>

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

            </div>
        </div>
    );
};

export default StunServerTester;
