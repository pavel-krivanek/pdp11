var RKDS, RKER, RKCS, RKWC, RKBA, drive, sector, surface, cylinder, rkimg;

var imglen = 2077696;

var
    RKOVR = (1<<14),
    RKNXD = (1<<7),
    RKNXC = (1<<6),
    RKNXS = (1<<5)
   ;

function
rkread16(a)
{
	switch(a) {
	case 0777400: return RKDS;
	case 0777402: return RKER;
	case 0777404: return RKCS | ((RKBA & 0x30000) >> 12);
	case 0777406: return RKWC;
	case 0777410: return RKBA & 0xFFFF;
	case 0777412: return (sector) | (surface << 4) | (cylinder << 5) | (drive << 13);
	}
	panic("invalid read");
}

function
rknotready()
{
	document.getElementById('rkbusy').style.display = '';
	RKDS &= ~(1<<6);
	RKCS &= ~(1<<7);
}

function
rkready()
{
	document.getElementById('rkbusy').style.display = 'none';
	RKDS |= 1<<6;
	RKCS |= 1<<7;
}

function
rkerror(code)
{	
	var msg;
	rkready();
	RKER |= code;
	RKCS |= (1<<15) | (1<<14);
	switch(code) {
	case RKOVR: msg = "operation overflowed the disk"; break;
	case RKNXD: msg = "invalid disk accessed"; break;
	case RKNXC: msg = "invalid cylinder accessed"; break;
	case RKNXS: msg = "invalid sector accessed"; break;
	}
	panic(msg);
}

function
rkrwsec(t)
{
	var pos;
	if(drive != 0) rkerror(RKNXD);
	if(cylinder > 0312) rkerror(RKNXC);
	if(sector > 013) rkerror(RKNXS);
	pos = (cylinder * 24 + surface * 12 + sector) * 512;
	for(i=0;i<256 && RKWC;i++) {
		if(t) {
			var val;
			val = memory[RKBA >> 1];
			rkdisk[pos] = val & 0xFF;
			rkdisk[pos+1] = (val >> 8) & 0xFF;
		}
		else
			memory[RKBA >> 1] = rkdisk[pos] | (rkdisk[pos+1] << 8);
		RKBA += 2;
		pos += 2;
		RKWC = (RKWC + 1) & 0xFFFF;
	}
	sector++;
	if(sector > 013) {
		sector = 0;
		surface++;
		if(surface > 1) {
			surface = 0;
			cylinder++;
			if(cylinder > 0312)
				rkerror(RKOVR);
		}
	}
	if(RKWC)
		setTimeout('rkrwsec('+t+')', 3);
	else {
		rkready();
		if(RKCS & (1<<6)) interrupt(INTRK, 5);
	}
}

function
rkgo()
{
	switch((RKCS & 017) >> 1) {
	case 0: rkreset(); break;
	case 1: rknotready(); setTimeout('rkrwsec(true)', 3); break;
	case 2: rknotready(); setTimeout('rkrwsec(false)', 3); break;
	default: panic("unimplemented RK05 operation " + ((RKCS & 017) >> 1).toString());
	}
}

function
rkwrite16(a,v)
{
	switch(a) {
	case 0777400: break;
	case 0777402: break;
	case 0777404:
		RKBA = (RKBA & 0xFFFF) | ((v & 060) << 12);
		v &= 017517; // writable bits
		RKCS &= ~017517;
		RKCS |= v & ~1; // don't set GO bit
		if(v & 1) rkgo();
		break;
	case 0777406: RKWC = v; break;
	case 0777410: RKBA = (RKBA & 0x30000) | v; break;
	case 0777412:
		drive = v >> 13;
		cylinder = (v >> 5) & 0377;
		surface = (v >> 4) & 1;
		sector = v & 15;
		break;
	default:
		panic("invalid write");
	}
}

function
rkreset()
{
	RKDS = (1 << 11) | (1 << 7) | (1 << 6);
	RKER = 0;
	RKCS = 1 << 7;
	RKWC = 0;
	RKBA = 0;
	RKDB = 0;
}

function
rkinit()
{
	var req, buf, i;
	req = new XMLHttpRequest();
//	req.open('GET', 'http://pdp11.aiju.de/rk0', false);
	req.open('GET', 'rk0', false);
	req.overrideMimeType('text/plain; charset=x-user-defined');
	req.send(null);
	if(req.status != 200) panic("could not load disk image");
	buf = req.responseText;
	if(buf.length != imglen) panic("file too short, got " + buf.length.toString() + ", expected " + imglen.toString());
	rkdisk = new Array(buf.length);
	for(i=0;i<buf.length;i++) {
		rkdisk[i] = buf.charCodeAt(i) & 0xFF;
	}
}
