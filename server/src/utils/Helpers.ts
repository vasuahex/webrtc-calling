


import os from 'os'
const ifaces = os.networkInterfaces()
const getLocalIp = () => {
    let localIp = '127.0.0.1'
    Object.keys(ifaces)?.forEach((ifname: any) => {
        if (ifaces[ifname]) {
            for (const iface of ifaces[ifname]) {
                // Ignore IPv6 and 127.0.0.1
                if (iface.family !== 'IPv4' || iface.internal !== false) {
                    continue
                }
                // Set the local ip to the first IPv4 address found and exit the loop
                localIp = iface.address
                return
            }
        }
    })
    return localIp
}

export default {
    getLocalIp
}