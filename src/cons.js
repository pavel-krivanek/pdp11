var TKS, TPS, keybuf = 0;

function
clearterminal()
{
	console.log("clearterminal");
	var len = document.getElementById("terminal").firstChild.nodeValue.length;
	document.getElementById("terminal").firstChild.deleteData(0, len);
	TKS = 0;
	TPS = 1<<7;
}

function
writeterminal(msg)
{
	for (i in msg) { 
		code = msg.charCodeAt(i);
		//console.log('type: '+code);
	//	if (code == 10) 
	//		crlf(13);
	//	else
			typeCharacter(code, false);
	}

	var ta = document.getElementById("terminal");
	ta.firstChild.appendData(msg);
	ta.scrollTop = ta.scrollHeight;
}

function
addchar(c)
{
	console.log('addchar: '+c);
	TKS |= 0x80;
	keybuf = c;
	if(TKS & (1<<6)) interrupt(INTTTYIN, 4);
}

function
specialchar(c)
{
	switch(c) {
//	case 42: keybuf = 4; break;
	case 19: keybuf = 034; break;
	case 9: keybuf = 9; break;
	default: return;
	}
	TKS |= 0x80;
	if(TKS & (1<<6)) interrupt(INTTTYIN, 4);
}

function
getchar()
{
	if(TKS & 0x80) {
		TKS &= 0xff7e;
		return keybuf;
	}
	return 0;
}

function
consread16(a)
{
	switch(a) {
	case 0777560: return TKS;
	case 0777562: return getchar();
	case 0777564: return TPS;
	case 0777566: return 0;
	}
	panic("read from invalid address " + ostr(a,6));
}

function
conswrite16(a,v)
{
	switch(a) {
	case 0777560:
		if(v & (1<<6))
			TKS |= 1<<6;
		else
			TKS &= ~(1<<6);
		break;
	case 0777564:
		if(v & (1<<6))
			TPS |= 1<<6;
		else
			TPS &= ~(1<<6);
		break;
	case 0777566:
		v &= 0xFF;
		if(!(TPS & 0x80)) break;
		switch(v) {
		case 13: break;
		default:
			writeterminal(String.fromCharCode(v & 0x7F));
		}
		TPS &= 0xff7f;
		if(TPS & (1<<6))
			setTimeout("TPS |= 0x80; interrupt(INTTTYOUT, 4);", 1);
		else
			setTimeout("TPS |= 0x80;", 1);
		break;
	default:
		panic("write to invalid address " + ostr(a,6));
	}
}
