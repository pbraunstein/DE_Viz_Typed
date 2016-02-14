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


// Takes raw json from data.json -- stores all the data
// This might break if the names of the raw json changes be aware
class Dictionary {
	roots: RootWord[];
	constructor(input_json: any) {
		this.roots = [];
		this.build_all_roots(input_json);
		this.sort();
	}

	private build_all_roots(input_json: any) {
		input_json.forEach((child) => {
			this.roots.push(this.build_root(child));
		});
	}

	private build_root(raw_root: any) {
		var new_root = new RootWord(raw_root.root, raw_root.trans);
		
		raw_root.childWords.forEach(function(child) {
			new_root.add_child(new ChildWord(child.verb, child.trans, child.separ))
		});

		return new_root;
	}

	private sort () {
		this.roots.sort(function(root1: RootWord, root2: RootWord) {
			return root1.german.localeCompare(root2.german);
		});
	}
}

// Technically holds the fdg AND the container
class FDG {
	private svg: any;
	private current_root: RootWord;

	constructor(public width: number, public height: number) {
		this.svg = d3.selectAll("div").select(function() { if (this.id == 'viz') return this; })
					.append("svg").attr("width", this.width).attr("height", this.height);

		// add bounding box
		this.svg.append("rect")
			.attr("x", 0)
			.attr("y", 0)
			.attr("width", this.width)
			.attr("height", this.height)
			.style("fill", "white")
			.style("stroke", "black");

		this.current_root = null;
	}

	build_new_tree(new_root: RootWord) {
		this.current_root = new_root;
	}
}


function run() {
	d3.json("data/data.json", function(error, json) {
		if (error) {return console.warn(error);}
		
		var german_words = new Dictionary(json);

		var fdg = new FDG(700, 700);
		fdg.build_new_tree(german_words.roots[5]);
		console.log(fdg);

	})
}

run();