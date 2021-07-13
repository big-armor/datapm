export class OraQuiet {
	isSpinning: false;
	text: "";
	prefixText: "";
	color: "black";
	indent: 1;
	spinner: "arc";

	start(): OraQuiet {
		return this;
	}

	stop(): OraQuiet {
		return this;
	}

	succeed(): OraQuiet {
		return this;
	}

	fail(): OraQuiet {
		return this;
	}

	warn(): OraQuiet {
		return this;
	}

	info(): OraQuiet {
		return this;
	}

	stopAndPersist(): OraQuiet {
		return this;
	}

	clear(): OraQuiet {
		return this;
	}

	render(): OraQuiet {
		return this;
	}

	frame(): string {
		return "";
	}
}
