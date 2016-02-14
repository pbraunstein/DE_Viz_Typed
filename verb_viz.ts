abstract class Word {
	constructor(public german: string, public english: string) {}
}

class ChildWord extends Word {
	constructor(german: string, english: string, public separable: boolean) {
		super(german, english);
	}
}

class RootWord extends Word {
	private children: ChildWord[];
	constructor(german: string, english: string) {
		super(german, english);
		this.children = [];
	}

	add_child(new_child: ChildWord) {
		this.children.push(new_child);
	}

	get_all_children() {
		return this.children;
	}
}