/** For passing around a native value type that is updated and read in separate structures.
 * Helps detangle complex stream monitoring */
export class Reference<T> {
	value: T;

	constructor(value: T) {
		this.value = value;
	}

	set(value: T): void {
		this.value = value;
	}

	get(): T {
		return this.value;
	}
}
