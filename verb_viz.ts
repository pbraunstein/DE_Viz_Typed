/// <reference path="lib/d3.d.ts"/>
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

// Takes raw json from data.json
class Dictionary {
	private roots: RootWord[];
	constructor(input_json: any) {
		this.roots = [];
		console.log(this.build_root(input_json[0]));
	}

	build_root(raw_root: any) {
		var new_root = new RootWord(raw_root.root, raw_root.trans);

		
		
		return new_root;

	}
}

function run() {
	d3.json("data/data.json", function(error, json) {
		if (error) {return console.warn(error);}
		
		var german_words = new Dictionary(json);
	})
}

run();