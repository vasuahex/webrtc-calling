


export const getTooltipStyle = (position: string) => {
    switch (position) {
        case 'top':
            return {
                tooltip: {
                    bottom: 'calc(100% + 10px)',
                    left: '50%',
                    transform: 'translateX(-50%)'
                },
                arrow: {
                    bottom: '-5px',
                    left: '50%',
                    marginLeft: '-5px',
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: '5px solid #000'
                }
            };
        case 'right':
            return {
                tooltip: {
                    top: '50%',
                    left: 'calc(100% + 10px)',
                    transform: 'translateY(-50%)'
                },
                arrow: {
                    top: '50%',
                    left: '-5px',
                    marginTop: '-5px',
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderRight: '5px solid #000'
                }
            };
        case 'bottom':
            return {
                tooltip: {
                    top: 'calc(100% + 10px)',
                    left: '50%',
                    transform: 'translateX(-50%)'
                },
                arrow: {
                    top: '-5px',
                    left: '50%',
                    marginLeft: '-5px',
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderBottom: '5px solid #000'
                }
            };
        case 'left':
            return {
                tooltip: {
                    top: '50%',
                    right: 'calc(100% + 10px)',
                    transform: 'translateY(-50%)'
                },
                arrow: {
                    top: '50%',
                    right: '-5px',
                    marginTop: '-5px',
                    borderTop: '5px solid transparent',
                    borderBottom: '5px solid transparent',
                    borderLeft: '5px solid #000'
                }
            };
        default:
            return {};
    }
};


const additionalStuns = [{ urls: 'stun:s1.taraba.net:3478' }, { urls: 'stun:numb.viagenie.ca:3478' },

    { urls: 'stun:s2.taraba.net:3478' },
    { urls: 'stun:stun.12connect.com:3478' },
    { urls: 'stun:stun.12voip.com:3478' },
    { urls: 'stun:stun.1und1.de:3478' },
    { urls: 'stun:stun.2talk.co.nz:3478' },
    { urls: 'stun:stun.2talk.com:3478' },
    { urls: 'stun:stun.3clogic.com:3478' },
    { urls: 'stun:stun.3cx.com:3478' },
    { urls: 'stun:stun.a-mm.tv:3478' },
    { urls: 'stun:stun.aa.net.uk:3478' },
    { urls: 'stun:stun.acrobits.cz:3478' },
    { urls: 'stun:stun.actionvoip.com:3478' },
    { urls: 'stun:stun.advfn.com:3478' },
    { urls: 'stun:stun.aeta-audio.com:3478' },
    { urls: 'stun:stun.aeta.com:3478' },
    { urls: 'stun:stun.alltel.com.au:3478' },
    { urls: 'stun:stun.altar.com.pl:3478' },
    { urls: 'stun:stun.annatel.net:3478' },
    { urls: 'stun:stun.antisip.com:3478' },
    { urls: 'stun:stun.arbuz.ru:3478' },
    { urls: 'stun:stun.avigora.com:3478' },
    { urls: 'stun:stun.avigora.fr:3478' },
    { urls: 'stun:stun.awa-shima.com:3478' },
    { urls: 'stun:stun.awt.be:3478' },
    { urls: 'stun:stun.b2b2c.ca:3478' },
    { urls: 'stun:stun.bahnhof.net:3478' },
    { urls: 'stun:stun.barracuda.com:3478' },
    { urls: 'stun:stun.bluesip.net:3478' },
    { urls: 'stun:stun.bmwgs.cz:3478' },
    { urls: 'stun:stun.botonakis.com:3478' },
    { urls: 'stun:stun.budgetphone.nl:3478' },
    { urls: 'stun:stun.budgetsip.com:3478' },
    { urls: 'stun:stun.cablenet-as.net:3478' },
    { urls: 'stun:stun.callromania.ro:3478' },
    { urls: 'stun:stun.callwithus.com:3478' },
    { urls: 'stun:stun.cbsys.net:3478' },
    { urls: 'stun:stun.chathelp.ru:3478' },
    { urls: 'stun:stun.cheapvoip.com:3478' },
    { urls: 'stun:stun.ciktel.com:3478' },
    { urls: 'stun:stun.cloopen.com:3478' },
    { urls: 'stun:stun.colouredlines.com.au:3478' },
    { urls: 'stun:stun.comfi.com:3478' },
    { urls: 'stun:stun.commpeak.com:3478' },
    { urls: 'stun:stun.comtube.com:3478' },
    { urls: 'stun:stun.comtube.ru:3478' },
    { urls: 'stun:stun.cope.es:3478' },
    { urls: 'stun:stun.counterpath.com:3478' },
    { urls: 'stun:stun.counterpath.net:3478' },
    { urls: 'stun:stun.cryptonit.net:3478' },
    { urls: 'stun:stun.darioflaccovio.it:3478' },
    { urls: 'stun:stun.datamanagement.it:3478' },
    { urls: 'stun:stun.dcalling.de:3478' },
    { urls: 'stun:stun.decanet.fr:3478' },
    { urls: 'stun:stun.demos.ru:3478' },
    { urls: 'stun:stun.develz.org:3478' },
    { urls: 'stun:stun.dingaling.ca:3478' },
    { urls: 'stun:stun.doublerobotics.com:3478' },
    { urls: 'stun:stun.drogon.net:3478' },
    { urls: 'stun:stun.duocom.es:3478' },
    { urls: 'stun:stun.dus.net:3478' },
    { urls: 'stun:stun.e-fon.ch:3478' },
    { urls: 'stun:stun.easybell.de:3478' },
    { urls: 'stun:stun.easycall.pl:3478' },
    { urls: 'stun:stun.easyvoip.com:3478' },
    { urls: 'stun:stun.efficace-factory.com:3478' },
    { urls: 'stun:stun.einsundeins.com:3478' },
    { urls: 'stun:stun.einsundeins.de:3478' },
    { urls: 'stun:stun.ekiga.net:3478' },
    { urls: 'stun:stun.epygi.com:3478' },
    { urls: 'stun:stun.etoilediese.fr:3478' },
    { urls: 'stun:stun.eyeball.com:3478' },
    { urls: 'stun:stun.faktortel.com.au:3478' },
    { urls: 'stun:stun.freecall.com:3478' },
    { urls: 'stun:stun.freeswitch.org:3478' },
    { urls: 'stun:stun.freevoipdeal.com:3478' },
    { urls: 'stun:stun.fuzemeeting.com:3478' },
    { urls: 'stun:stun.gmx.de:3478' },
    { urls: 'stun:stun.gmx.net:3478' },
    { urls: 'stun:stun.gradwell.com:3478' },
    { urls: 'stun:stun.halonet.pl:3478' },
    { urls: 'stun:stun.hellonanu.com:3478' },
    { urls: 'stun:stun.hoiio.com:3478' },
    { urls: 'stun:stun.hosteurope.de:3478' },
    { urls: 'stun:stun.ideasip.com:3478' },
    { urls: 'stun:stun.imesh.com:3478' },
    { urls: 'stun:stun.infra.net:3478' },
    { urls: 'stun:stun.internetcalls.com:3478' },
    { urls: 'stun:stun.intervoip.com:3478' },
    { urls: 'stun:stun.ipcomms.net:3478' },
    { urls: 'stun:stun.ipfire.org:3478' },
    { urls: 'stun:stun.ippi.fr:3478' },
    { urls: 'stun:stun.ipshka.com:3478' },
    { urls: 'stun:stun.iptel.org:3478' },
    { urls: 'stun:stun.irian.at:3478' },
    { urls: 'stun:stun.it1.hr:3478' },
    { urls: 'stun:stun.ivao.aero:3478' },
    { urls: 'stun:stun.jappix.com:3478' },
    { urls: 'stun:stun.jumblo.com:3478' },
    { urls: 'stun:stun.justvoip.com:3478' },
    { urls: 'stun:stun.kanet.ru:3478' },
    { urls: 'stun:stun.kiwilink.co.nz:3478' },
    { urls: 'stun:stun.kundenserver.de:3478' },
    { urls: 'stun:stun.linea7.net:3478' },
    { urls: 'stun:stun.linphone.org:3478' },
    { urls: 'stun:stun.liveo.fr:3478' },
    { urls: 'stun:stun.lowratevoip.com:3478' },
    { urls: 'stun:stun.lugosoft.com:3478' },
    { urls: 'stun:stun.lundimatin.fr:3478' },
    { urls: 'stun:stun.magnet.ie:3478' },
    { urls: 'stun:stun.manle.com:3478' },
    { urls: 'stun:stun.mgn.ru:3478' },
    { urls: 'stun:stun.mit.de:3478' },
    { urls: 'stun:stun.mitake.com.tw:3478' },
    { urls: 'stun:stun.miwifi.com:3478' },
    { urls: 'stun:stun.modulus.gr:3478' },
    { urls: 'stun:stun.mozcom.com:3478' },
    { urls: 'stun:stun.myvoiptraffic.com:3478' },
    { urls: 'stun:stun.mywatson.it:3478' },
    { urls: 'stun:stun.nas.net:3478' },
    { urls: 'stun:stun.neotel.co.za:3478' },
    { urls: 'stun:stun.netappel.com:3478' },
    { urls: 'stun:stun.netappel.fr:3478' },
    { urls: 'stun:stun.netgsm.com.tr:3478' },
    { urls: 'stun:stun.nfon.net:3478' },
    { urls: 'stun:stun.noblogs.org:3478' },
    { urls: 'stun:stun.noc.ams-ix.net:3478' },
    { urls: 'stun:stun.node4.co.uk:3478' },
    { urls: 'stun:stun.nonoh.net:3478' },
    { urls: 'stun:stun.nottingham.ac.uk:3478' },
    { urls: 'stun:stun.nova.is:3478' },
    { urls: 'stun:stun.nventure.com:3478' },
    { urls: 'stun:stun.on.net.mk:3478' },
    { urls: 'stun:stun.ooma.com:3478' },
    { urls: 'stun:stun.ooonet.ru:3478' },
    { urls: 'stun:stun.oriontelekom.rs:3478' },
    { urls: 'stun:stun.outland-net.de:3478' },
    { urls: 'stun:stun.ozekiphone.com:3478' },
    { urls: 'stun:stun.patlive.com:3478' },
    { urls: 'stun:stun.personal-voip.de:3478' },
    { urls: 'stun:stun.petcube.com:3478' },
    { urls: 'stun:stun.phone.com:3478' },
    { urls: 'stun:stun.phoneserve.com:3478' },
    { urls: 'stun:stun.pjsip.org:3478' },
    { urls: 'stun:stun.poivy.com:3478' },
    { urls: 'stun:stun.powerpbx.org:3478' },
    { urls: 'stun:stun.powervoip.com:3478' },
    { urls: 'stun:stun.ppdi.com:3478' },
    { urls: 'stun:stun.prizee.com:3478' },
    { urls: 'stun:stun.qq.com:3478' },
    { urls: 'stun:stun.qvod.com:3478' },
    { urls: 'stun:stun.rackco.com:3478' },
    { urls: 'stun:stun.rapidnet.de:3478' },
    { urls: 'stun:stun.rb-net.com:3478' },
    { urls: 'stun:stun.refint.net:3478' },
    { urls: 'stun:stun.remote-learner.net:3478' },
    { urls: 'stun:stun.rixtelecom.se:3478' },
    { urls: 'stun:stun.rockenstein.de:3478' },
    { urls: 'stun:stun.rolmail.net:3478' }
    ]

export const peersToTest = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun.l.stundata.com:3478' },
      { urls: 'stun:openrelay.metered.ca:80' },
      { urls: 'stun:openrelay.metered.ca:443' },
      { urls: 'stun:openrelay.metered.ca:5349' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.services.mozilla.com' },
      { urls: 'stun:stun.ekiga.net' },
      { urls: 'stun:stun.ideasip.com' },
      { urls: 'stun:stun.rixtelecom.se' },
      { urls: 'stun:stun.schlund.de' },
      { urls: 'stun:stun.stunprotocol.org:3478' },
      { urls: 'stun:stun.voiparound.com' },
      { urls: 'stun:stun.voipbuster.com' },
      { urls: 'stun:stun.voipstunt.com' },
      { urls: 'stun:stun.voxgratia.org' },
      { urls: 'stun:stun.xten.com' },
      { urls: 'turn:turn.anyfirewall.com:443?transport=tcp', username: 'webrtc', credential: 'webrtc' },
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:5349', username: 'openrelayproject', credential: 'openrelayproject' },
      ...additionalStuns
  
    ],
    iceCandidatePoolSize: 10
  };
