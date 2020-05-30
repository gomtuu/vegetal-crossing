const breed_lookup = [
    ['0000', '1010', '1111'],
    ['1010', '2110', '2121'],
    ['1111', '2121', '2222']
];


class VegetalButton {

    constructor(element_id, click_callback, states) { // {{{
        this.element = document.getElementById(element_id);
        this.element.addEventListener('click', evt => { click_callback(this.next_state()[0]); });
        this.states = states;
        this.state = 0;
    } // }}}

    get_state() { // {{{
        return this.states[this.state];
    } // }}}

    set_state(new_state) { // {{{
        var states_list = Array.from(this.states, item => item[0])
        this.state = states_list.indexOf(new_state);
        this.element.innerHTML = this.get_state()[1];
    } // }}}

    next_state() { // {{{
        var new_state = (this.state + 1) % this.states.length;
        this.set_state(this.states[new_state][0]);
        return this.get_state();
    } // }}}

}


class VegetalApp {

    constructor(element_id) { // {{{
        this.element = document.getElementById(element_id);
        this.diagram = new VegetalDiagram(this.element.querySelector('.diagram'), {'clickable': true});
        this.prob_button = new VegetalButton('prob_mode', mode => {
            this.diagram.set_prob_mode(mode);
            this.diagram.refresh();
            localStorage.setItem('prob_mode', mode);
        }, [
            ['like', 'Probabilities: Like Fractions'],
            ['reduced', 'Probabilities: Reduced Fracs'],
            ['percent', 'Probabilities: Percentages']
        ]);
        this.breed_button = new VegetalButton('breed_mode', mode => {
            this.diagram.set_breed_mode(mode);
            this.diagram.refresh();
        }, [
            ['all', 'Breeding: <span class="vcfont">×</span> All Combos'],
            ['clones', 'Breeding: <span class="vcfont">⊙</span> Clones Only']
        ]);
        this.rose_view_button = new VegetalButton('rose_view', mode => {
            this.diagram.set_rose_view(mode);
            localStorage.setItem('rose_view', mode);
        }, [
            ['full', 'Rose View: Full'],
            ['condensed', 'Rose View: Condensed']
        ]);
    } // }}}

    set_fragment(hash) { // {{{
        history.replaceState(null, null, document.location.pathname + '#' + hash);
    } // }}}

    section_click(evt) { // {{{
        var species = evt.target.closest('[data-species]').dataset.species;
        history.replaceState(null, null, document.location.pathname + '#' + species);
        this.diagram.clear_parents();
        this.diagram.clear_offspring();
        return false;
    } // }}}

    breed_link_click(evt) { // {{{
        var button = evt.target.closest('.breed');
        var parent_divs = button.querySelectorAll('.parent');
        var pools = {};
        if (parent_divs.length == 2) {
            pools['A'] = parse_genespecs(parent_divs[0].title);
            pools['B'] = parse_genespecs(parent_divs[1].title);
        } else {
            for (let div of parent_divs) {
                let pool = div.dataset.pool;
                pools[pool] = pools[pool].concat(parse_genespecs(div.title));
            }
        }
        this.diagram.set_breed_mode(button.dataset.mode || 'all');
        this.breed_button.set_state(this.diagram.breed_mode);
        this.diagram.set_pools(pools);
        this.diagram.refresh();
        document.querySelector('#breed_mode').scrollIntoView();
        evt.preventDefault();
        evt.stopPropagation();
    } // }}}

    repeat_button_click(evt) { // {{{
        var button = evt.target.closest('button[title]');
        var offspring = parse_genespecs(button.title);
        var flowers = this.diagram.element.querySelectorAll('div.varieties > div[data-count]:not([data-count="0"])');
        var count_list = [];
        for (let flower of flowers) {
            if (flower.title in offspring) {
                count_list.push(Number(flower.dataset.count));
            }
        }
        var gcd = list_gcd(count_list);
        var parents = {};
        for (let flower of flowers) {
            if (flower.title in offspring) {
                let quantity = Number(flower.dataset.count) / gcd;
                parents[flower.title] = quantity;
            }
        }
        evt.preventDefault();
        evt.stopPropagation();
        if (Object.keys(parents).length == 0) {
            return false;
        }
        this.diagram.set_pools({'A': parents, 'B': parents});
        this.diagram.refresh();
    } // }}}

    set_species(species) { // {{{
        var section = this.element.querySelector('section');
        species_buttons.forEach(function(button, i) {
            button.classList.remove('selected');
        });
        this.element.querySelector('div.species_menu button.' + species).classList.add('selected');
        section.dataset.species = species;
        this.diagram.set_species(species);
    } // }}}

    highlight_varieties(evt) { // {{{
        var icon = evt.target.closest('[title]');
        this.diagram.highlight_varieties(true, icon.title);
    } // }}}

    unhighlight_varieties(evt) { // {{{
        var icon = evt.target.closest('[title]');
        this.diagram.highlight_varieties(false, icon.title);
    } // }}}

    use_fragment() { // {{{
        var fragment = window.location.hash;
        var options = parse_fragment(fragment);
        if ('species' in options) {
            var help_topic = document.querySelector('#' + options.species) || false;
            if (help_topic) {
                document.querySelector('div#help').classList.remove('rolled_up');
                help_topic.scrollIntoView();
                return;
            }
            this.set_species(options.species);
        }
        if ('pools' in options) {
            this.diagram.set_pools(options.pools);
        }
        if ('breed_mode' in options) {
            this.diagram.set_breed_mode(options.breed_mode);
            this.breed_button.set_state(this.diagram.breed_mode);
        }
    } // }}}

    load_settings() { // {{{
        var prob_mode = localStorage.getItem('prob_mode') || 'like';
        this.prob_button.set_state(prob_mode);
        this.diagram.set_prob_mode(prob_mode);
        var rose_view = localStorage.getItem('rose_view') || 'full';
        this.rose_view_button.set_state(rose_view);
        this.diagram.set_rose_view(rose_view);
    } // }}}

}


class VegetalDiagram {

    constructor(element, options) { // {{{
        this.element = element
        this.flowers = this.element.querySelectorAll('div.varieties > div');
        if (options.clickable || false) {
            for (let flower of this.flowers) {
                flower.addEventListener('click', evt => this.flower_click(evt));
            }
        };
        this.pools_with_flowers = 0;
        options = options || {};
        this.set_species(options.species || 'cosmos');
        this.set_prob_mode(options.prob_mode || 'like');
        this.set_breed_mode(options.breed_mode || 'all');
        if (options.pools !== undefined) {
            this.set_pools(options.pools);
            this.refresh();
        }
    } // }}}

    breed_multiple() { // {{{
        var all_counts = {};
        for (let A of this.flowers) {
            for (let B of this.flowers) {
                let freq_all = (A.dataset.A || 0) * (B.dataset.B || 0);
                let freq_clones = A.dataset.C || 0;
                let should_breed_all = (this.breed_mode == 'all' && freq_all > 0);
                let should_breed_clones = (this.breed_mode == 'clones' && A == B && freq_clones > 0)
                if (should_breed_all || should_breed_clones) {
                    let counts = breed(A.title, B.title);
                    if (this.breed_mode == 'all') {
                        var freq_multiplier = freq_all;
                    } else {
                        var freq_multiplier = freq_clones;
                    }
                    for (let genome in counts) {
                        all_counts[genome] = (all_counts[genome] || 0) + counts[genome] * freq_multiplier;
                    }
                }
            }
        }
        if (Object.entries(all_counts).length && this === app.diagram) {
            app.set_fragment(this.encode_options());
        }
        return all_counts;
    } // }}}

    clear_offspring() { // {{{
        for (let flower of this.flowers) {
            delete flower.dataset.count;
            flower.querySelectorAll('.result').forEach(result => flower.removeChild(result));
        }
    } // }}}

    show_offspring(genome_counts) { // {{{
        if (Object.keys(genome_counts).length == 0) {
            return false;
        }
        this.clear_offspring();
        var disp_func = {
            'like': fraction_genomes_like,
            'reduced': fraction_genomes_reduced,
            'percent': fraction_genomes_percent
        }[this.prob_mode];
        var offspring = disp_func(genome_counts);
        for (let flower of this.flowers) {
            var genome = flower.title;
            flower.dataset.count = genome_counts[genome] || 0;
            if (genome in offspring) {
                var result_div = document.createElement('div');
                result_div.classList.add('result');
                if (this.prob_mode == "percent") {
                    result_div.dataset.percentage = offspring[genome][0];
                } else {
                    result_div.dataset.numerator = offspring[genome][0];
                    result_div.dataset.denominator = offspring[genome][1];
                }
                flower.appendChild(result_div);
            }
        }
        return true;
    } // }}}

    clear_parents() { // {{{
        for (let flower of this.flowers) {
            delete flower.dataset.A;
            delete flower.dataset.B;
            delete flower.dataset.C;
        }
        this.pools_with_flowers = 0;
    } // }}}

    select_flower(pool, flower, quantity) { // {{{
        var new_qty = {};
        if (quantity === undefined) {
            new_qty['A'] = (Number(flower.dataset.A) || 0) + 1;
            new_qty['B'] = (Number(flower.dataset.B) || 0) + 1;
        } else {
            new_qty['A'] = quantity;
            new_qty['B'] = quantity;
        }
        if (this.breed_mode == 'all') {
            flower.dataset[pool] = new_qty[pool];
            this.pools_with_flowers = {'A': 1, 'B': 2}[pool];
        } else {
            flower.dataset.A = new_qty['A'];
            flower.dataset.B = new_qty['B'];
            this.pools_with_flowers = 2;
        }
    } // }}}

    encode_options() { // {{{
        var counts_A = {};
        var counts_B = {};
        for (let flower of this.flowers) {
            if ((flower.dataset.A || 0) > 0) {
                counts_A[flower.title] = flower.dataset.A;
            }
            if ((flower.dataset.B || 0) > 0) {
                counts_B[flower.title] = flower.dataset.B;
            }
        }
        var species = this.element.dataset.species;
        var pool_A = encode_genespecs(counts_A);
        var pool_B = encode_genespecs(counts_B);
        var pools = pool_A;
        if (pool_A != pool_B) {
            pools += '|' + pool_B;
        }
        var hash = species + '/' + pools;
        if (this.breed_mode == 'clones') {
            hash += '/clones';
        }
        return hash;
    } // }}}

    flower_click(evt) { // {{{
        evt.preventDefault();
        evt.stopPropagation();
        var flower = evt.target.closest('[title]');
        var add_to_selection = evt.ctrlKey;
        var max_pools = this.breed_mode == 'clones' ? 1 : 2;
        var should_clear = !add_to_selection && (this.pools_with_flowers >= max_pools);
        if (should_clear) {
            this.clear_parents();
        }
        var pool = Math.max(0, this.pools_with_flowers - (add_to_selection ? 1 : 0));
        this.select_flower(['A', 'B'][pool], flower);
        this.refresh();
        return false;
    } // }}}

    set_species(species) { // {{{
        this.clear_parents();
        this.clear_offspring();
        this.element.dataset.species = species;
    } // }}}

    set_pools(pools) { // {{{
        this.clear_parents();
        for (let pool of ['A', 'B']) {
            for (let entry of Object.entries(pools[pool])) {
                let flower = this.element.querySelector('[title="' + entry[0] + '"]');
                this.select_flower(pool, flower, entry[1]);
            }
        }
        return false;
    } // }}}

    set_pool_C() { // {{{
        var same = true;
        for (let flower of this.flowers) {
            if ((flower.dataset.A || 0) != (flower.dataset.B || 0)) {
                same = false;
                break;
            }
        }
        for (let flower of [...this.flowers].filter(f => f.dataset.A !== undefined || f.dataset.B !== undefined)) {
            if (same) {
                flower.dataset.C = flower.dataset.A;
            } else {
                let new_C = Number(flower.dataset.A || 0) + Number(flower.dataset.B || 0)
                flower.dataset.C = new_C;
            }
        }
    } // }}}

    set_prob_mode(mode) { // {{{
        this.prob_mode = mode;
    } // }}}

    set_breed_mode(mode) { // {{{
        this.element.dataset.breedMode = mode;
        this.breed_mode = mode;
    } // }}}

    set_rose_view(mode) {
        if (mode == 'full') {
            this.element.classList.remove('condensed');
        } else if (mode == 'condensed') {
            this.element.classList.add('condensed');
        }
    }

    set_options(options) { // {{{
        if ('species' in options) {
            this.set_species(options.species);
        }
        if ('pools' in options) {
            this.set_pools(options.pools);
        }
        if ('breed_mode' in options) {
            this.set_breed_mode(options.breed_mode);
        }
        this.refresh();
    } // }}}

    refresh() { // {{{
        if (this.breed_mode == 'clones') {
            this.set_pool_C();
        }
        var offspring = this.breed_multiple();
        this.show_offspring(offspring);
    }
    // }}}

    highlight_varieties(state, genespecs) { // {{{
        var genotypes = parse_genespecs(genespecs);
        var selector = '[title="' + Object.keys(genotypes).join('"], [title="');
        var varieties = this.element.querySelectorAll(selector);
        for (let variety of varieties) {
            if (state) {
                variety.classList.add('highlighted');
            } else {
                variety.classList.remove('highlighted');
            }
        }
    } // }}}

}


function multiply(A, B) { // {{{
    var combos = [];
    for (var i=0; i < A.length; i++) {
        for (var j=0; j < B.length; j++) {
            combos.push(A[i] + B[j]);
        }
    }
    return combos;
} // }}}

function breed(A, B) { // {{{
    var genes_a = Array.from(A, digit => Number(digit));
    var genes_b = Array.from(B, digit => Number(digit));
    var possibilities = [];
    for (let i=0; i < genes_a.length; i++) {
        possibilities[i] = breed_lookup[genes_a[i]][genes_b[i]];
    }
    var genomes = possibilities.shift();
    while (possibilities.length) {
        suffixes = possibilities.shift();
        genomes = multiply(genomes, suffixes);
    }
    var genome_counts = {}
    genomes.forEach(g => genome_counts[g] = (genome_counts[g] || 0) + 1);
    return genome_counts;
} // }}}

function list_gcd(nums) { // {{{
    var run_gcd = [];
    for (let num of nums) {
        run_gcd.push(num);
        if (run_gcd.length == 2) {
            let new_gcd = FractionReduce.getGCD(run_gcd.shift(), run_gcd.shift());
            run_gcd.push(new_gcd);
        }
    }
    return run_gcd[0];
} // }}}

function fraction_genomes_like(genome_counts) { // {{{
    var genome_fracs = {}
    var total_genomes = 0;
    for (let genome in genome_counts) {
        total_genomes += genome_counts[genome];
    }
    var gcd = list_gcd(Object.values(genome_counts));
    for (let genome in genome_counts) {
        let numerator = genome_counts[genome] / gcd;
        let denominator = total_genomes / gcd;
        genome_fracs[genome] = [numerator, denominator];
    }
    return genome_fracs;
} // }}}

function fraction_genomes_reduced(genome_counts) { // {{{
    var genome_fracs = {}
    var total_genomes = 0;
    for (let genome in genome_counts) {
        total_genomes += genome_counts[genome];
    }
    for (let genome in genome_counts) {
        let fraction = FractionReduce.reduce(genome_counts[genome], total_genomes);
        genome_fracs[genome] = fraction;
    }
    return genome_fracs;
} // }}}

function fraction_genomes_percent(genome_counts) { // {{{
    var genome_fracs = {}
    var total_genomes = 0;
    for (let genome in genome_counts) {
        total_genomes += genome_counts[genome];
    }
    for (let genome in genome_counts) {
        let fraction = [Math.round((genome_counts[genome] / total_genomes) * 10000) / 100, 1];
        genome_fracs[genome] = fraction;
    }
    return genome_fracs;
} // }}}

function parse_fragment(fragment) { // {{{
    let no = item => (item === undefined || item.length == 0);
    var options = {};
    if (no(fragment)) return options;
    var [species, pools_str, breed_mode] = fragment.replace(/^#/, '').split('/');
    if (no(species)) return options;
    options.species = species;
    if (no(pools_str)) return options;
    var [str_A, str_B] = pools_str.split('|');
    if (no(str_A)) return options;
    var pool_A = parse_genespecs(str_A);
    if (no(str_B)) {
        var pool_B = pool_A;
    } else {
        var pool_B = parse_genespecs(str_B);
    }
    options.pools = {'A': pool_A, 'B': pool_B};
    if (no(breed_mode)) return options;
    options.breed_mode = breed_mode;
    return options;
} // }}}

function parse_genespecs(genespecs_string) { // {{{
    var genespecs = genespecs_string.split(',');
    var genotypes = {}
    for (let genespec of genespecs) {
        let parts = genespec.split('x');
        let copies = 0;
        let genotype = undefined;
        if (parts.length == 1) {
            copies = 1;
            genotype = parts[0];
        } else if (parts.length == 2) {
            copies = parts[0];
            genotype = parts[1];
        }
        if (!genotype.match(/^[012]{3,4}$/)) {
            alert('Error! Unrecognized genotype: ' + genotype);
            break;
        }
        genotypes[genotype] = copies;
    }
    return genotypes;
} // }}}

function encode_genespecs(genome_counts) { // {{{
    var encoded_items = [];
    for (let entry of Object.entries(genome_counts)) {
        let genotype = entry[0];
        let count = entry[1];
        if (count === undefined || count == 0) {
            continue;
        }
        let multiplier = (count > 1) ? String(count) + 'x' : '';
        encoded_items.push(multiplier + genotype);
    }
    return encoded_items.join(',');
} // }}}

var app = new VegetalApp('vegetal_app');

var species_buttons = document.querySelectorAll('div.species_menu button');
species_buttons.forEach(function(el, i) {
    el.addEventListener('click', function(evt) {
        var species = evt.target.closest('button').classList[0];
        app.set_species(species);
        history.replaceState(null, null, document.location.pathname + '#' + species);
    });
});

var sections = document.querySelectorAll('section');
sections.forEach(function(el, i) {
    el.addEventListener('click', evt => app.section_click(evt));
});

var breed_links = document.querySelectorAll('.breed');
breed_links.forEach(function(el, i) {
    el.addEventListener('click', evt => app.breed_link_click(evt));
});

var repeat_buttons = document.querySelectorAll('button.repeat');
repeat_buttons.forEach(function(el, i) {
    el.addEventListener('click', evt => app.repeat_button_click(evt));
});

var breed_icons = document.querySelectorAll('div.breed .parent, div.breed .offspring, button.repeat');
breed_icons.forEach(element => element.addEventListener('mouseover', evt => app.highlight_varieties(evt)));
breed_icons.forEach(element => element.addEventListener('mouseout', evt => app.unhighlight_varieties(evt)));

document.querySelector('button#toggle_help').addEventListener('click', evt => {
    document.querySelector('div#help').classList.toggle('rolled_up');
    evt.preventDefault();
    evt.stopPropagation();
});

var pagers = document.querySelectorAll('button.pager');
pagers.forEach(pager => pager.addEventListener('click', evt => {
    var container = evt.target.closest('[data-page]');
    var h4 = container.querySelector('header h4');
    var pages = container.querySelectorAll('.page');
    var page = Number(container.dataset.page);
    var button = evt.target.closest('[data-delta]');
    var delta = Number(button.dataset.delta);
    var new_page = (page + delta + pages.length) % pages.length;
    container.dataset.page = new_page;
    for (let page of pages) {
        page.classList.remove('current_page');
    }
    pages[new_page].classList.add('current_page');
    h4.innerHTML = pages[new_page].dataset.name;
    evt.preventDefault();
    evt.stopPropagation();
}));

window.addEventListener('hashchange', evt => app.use_fragment(evt));
app.load_settings();
app.use_fragment();
app.diagram.refresh();
