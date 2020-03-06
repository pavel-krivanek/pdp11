var rs = ["R0", "R1", "R2", "R3", "R4", "R5", "SP", "PC"];
var disasmtable = [
	[0077700, 0005000, "CLR", "D", true],
	[0077700, 0005100, "COM", "D", true],
	[0077700, 0005200, "INC", "D", true],
	[0077700, 0005300, "DEC", "D", true],
	[0077700, 0005400, "NEG", "D", true],
	[0077700, 0005700, "TST", "D", true],
	[0077700, 0006200, "ASR", "D", true],
	[0077700, 0006300, "ASL", "D", true],
	[0077700, 0006000, "ROR", "D", true],
	[0077700, 0006100, "ROL", "D", true],
	[0177700, 0000300, "SWAB", "D", false],
	[0077700, 0005500, "ADC", "D", true],
	[0077700, 0005600, "SBC", "D", true],
	[0177700, 0006700, "SXT", "D", false],
	[0070000, 0010000, "MOV", "SD", true],
	[0070000, 0020000, "CMP", "SD", true],
	[0170000, 0060000, "ADD", "SD", false],
	[0170000, 0160000, "SUB", "SD", false],
	[0070000, 0030000, "BIT", "SD", true],
	[0070000, 0040000, "BIC", "SD", true],
	[0070000, 0050000, "BIS", "SD", true],
	[0177000, 0070000, "MUL", "RD", false],
	[0177000, 0071000, "DIV", "RD", false],
	[0177000, 0072000, "ASH", "RD", false],
	[0177000, 0073000, "ASHC", "RD", false],
	[0177400, 0000400, "BR", "O", false],
	[0177400, 0001000, "BNE", "O", false],
	[0177400, 0001400, "BEQ", "O", false],
	[0177400, 0100000, "BPL", "O", false],
	[0177400, 0100400, "BMI", "O", false],
	[0177400, 0101000, "BHI", "O", false],
	[0177400, 0101400, "BLOS", "O", false],
	[0177400, 0102000, "BVC", "O", false],
	[0177400, 0102400, "BVS", "O", false],
	[0177400, 0103000, "BCC", "O", false],
	[0177400, 0103400, "BCS", "O", false],
	[0177400, 0002000, "BGE", "O", false],
	[0177400, 0002400, "BLT", "O", false],
	[0177400, 0003000, "BGT", "O", false],
	[0177400, 0003400, "BLE", "O", false],
	[0177700, 0000100, "JMP", "D", false],
	[0177000, 0004000, "JSR", "RD", false],
	[0177770, 0000200, "RTS", "R", false],
	[0177777, 0006400, "MARK", "", false],
	[0177000, 0077000, "SOB", "RO", false],
	[0177777, 0000005, "RESET", "", false],
	[0177700, 0006500, "MFPI", "D", false],
	[0177700, 0006600, "MTPI", "D", false],
	[0177777, 0000001, "WAIT", "", false],
	[0177777, 0000002, "RTI", "", false],
	[0177777, 0000006, "RTT", "", false],
	[0177400, 0104000, "EMT", "N", false],
	[0177400, 0104400, "TRAP", "N", false],
	[0177777, 0000003, "BPT", "", false],
	[0177777, 0000004, "IOT", "", false]
];

function
disasmaddr(m,a)
{
	if((m & 7) == 7) {
		switch(m) {
		case 027: a[0]+=2;return "$" + memory[a[0]>>1].toString(8);
		case 037: a[0]+=2;return "*" + memory[a[0]>>1].toString(8);
		case 067: a[0]+=2;return "*" + ((a[0] + 2 + memory[a[0]>>1]) & 0xFFFF).toString(8);
		case 077: a[0]+=2;return "**" + ((a[0] + 2 + memory[a[0]>>1]) & 0xFFFF).toString(8);
		}
	}
	r = rs[m & 7];
	switch(m & 070) {
	case 000: return r;
	case 010: return "(" + r + ")";
	case 020: return "(" + r + ")+";
	case 030: return "*(" + r + ")+";
	case 040: return "-(" + r + ")";
	case 050: return "*-(" + r + ")";
	case 060: a[0]+=2;return memory[a[0]>>1].toString(8) + "(" + r + ")";
	case 070: a[0]+=2;return "*" + memory[a[0]>>1].toString(8) + "(" + r + ")";
	}
}

function
disasm(a)
{
	var i, ins, l, msg, s, d;
	ins = memory[a>>1];
	for(i=0;i<disasmtable.length;i++) {
		l = disasmtable[i];
		if((ins & l[0]) == l[1]) {
			msg = l[2];
			break;
		}
	}
	if(msg == undefined)
		return "???";
	if(l[4] && ins & 0100000) msg += "B";
	s = (ins & 07700) >> 6;
	d = ins & 077;
	o = ins & 0377;
	aa = [a];
	switch(l[3]) {
	case "SD": msg += " " + disasmaddr(s, aa) + ","; // fallthrough
	case "D": msg += " " + disasmaddr(d, aa); break;
	case "RO": msg += " " + rs[(ins & 0700) >> 6] + ","; o &= 077; // fallthrough
	case "O":
		if(o & 0x80) {
			msg += " -" + (2*((0xFF ^ o) + 1)).toString(8);
		} else {
			msg += " +" + (2*o).toString(8);
		} break;
	case "RD": msg += " " + rs[(ins & 0700) >> 6] + ", " + disasmaddr(d, aa); break;
	case "R": msg += " " + rs[ins & 7]; break;
	case "R3": msg += " " + rs[(ins & 0700) >> 6]; break;
	}
	return msg;
}
