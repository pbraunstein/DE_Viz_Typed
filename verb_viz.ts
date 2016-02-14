/// <reference path="lib/d3.d.ts"/>
abstract class Word {
	constructor(public german: string, public english: string, public separable: boolean) {}
}

class ChildWord extends Word {
	constructor(german: string, english: string, separable: boolean) {
		super(german, english, separable);
	}
}


class RootWord extends Word {
	private children: ChildWord[];
	constructor(german: string, english: string, separable = false) {
		super(german, english, separable);
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

// Can be root or child. So it takes parent class of both
class FDGNode {
	german: string;
	english: string;
	hub: boolean;
	separable: boolean;

	// todo: group number used for color - not a great implementation
	constructor(word: Word, public group: number) {
		// Use type of class to determine if it should be a hub
		if (word instanceof RootWord) {
			this.hub = true;
		} else {
			this.hub = false;
		}

		this.german = word.german;
		this.english = word.english;
		this.separable = word.separable;

	}
}

class FDGLink {
	link_length: number;
	constructor(node: FDGNode, public source: number, public target: number, public value: number) {
		if (node.separable) {
			this.link_length = 300;
		} else {
			this.link_length = 150;
		}
	}
}

// Technically holds the fdg AND the container
class FDG {
	svg: any;
	colors: d3.scale.Ordinal<string, string>;
	node_rad: number;
	hub_scale_factor: number;
	trans_duration: number;
	pause_duration: number;

	private current_root: RootWord;

	constructor(public width: number, public height: number) {
		// create SVG
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

		// init constants
		this.colors = d3.scale.category20();
		this.node_rad = 30;
		this.hub_scale_factor = 2;
		this.trans_duration = 1000;
		this.pause_duration = 1000;

		this.current_root = null;
	}

	build_new_tree(new_root: RootWord) {
		this.clear_tree()
		this.current_root = new_root;
		var nodes = this.build_nodes();
		var links = this.build_links(nodes);
		console.log(links);

	}

	private build_nodes() {
		var i = 1;
		var new_nodes: FDGNode[] = []
		new_nodes.push(new FDGNode(this.current_root, i++));

		this.current_root.get_all_children().forEach(function(child){
			new_nodes.push(new FDGNode(child, i++));
		})

		return new_nodes;
	}

	private build_links(nodes: FDGNode[]) {
		var new_links: FDGLink[] = [];

		nodes.forEach(function(node, index) {
			if (!node.hub) {
				new_links.push(new FDGLink(node, 0, index, 6))
			}
		});

		return new_links;
	}

	private clear_tree() {
		if (this.current_root) {
			this.svg.selectAll(".node").remove()
			this.svg.selectAll(".link").remove()
		}
	}
}


function run() {
	d3.json("data/data.json", function(error, json) {
		if (error) {return console.warn(error);}
		
		var german_words = new Dictionary(json);

		var fdg = new FDG(700, 700);
		fdg.build_new_tree(german_words.roots[6]);

	})
}

run();