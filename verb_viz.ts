abstract class Word {
	constructor(public german: string, public english: string) {}
}

class ChildWord extends Word {
	constructor(german: string, english: string, public separable: boolean) {
		super(german, english);
	}
}