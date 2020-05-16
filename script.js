var selected = [];
var flower_objects = {};
var breed_mode = 'all';
const breed_lookup = [
    ['0000', '1010', '1111'],
    ['1010', '2110', '2121'],
    ['1111', '2121', '2222']
];

var FractionReduce = (function(){ // {{{
    // Euclid's Algorithm
    var getGCD = function(n, d){
        var numerator = (n<d) ? n : d;
        var denominator = (n<d) ? d : n;
        var remainder = numerator;
        var lastRemainder = numerator;

        while (true){
            lastRemainder = remainder;
            remainder = denominator % numerator;
            if (remainder === 0){
                break;
            }
            denominator = numerator;
            numerator = remainder;
        }
        if(lastRemainder){
            return lastRemainder;
        }
    };

    var reduce = function(n, d){
        var gcd = getGCD(n, d);

        return [n/gcd, d/gcd];
    };

    return {
            getGCD:getGCD,
            reduce:reduce
           };
}()); // }}}

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

function pools_equal(A, B) { /// {{{
    if (A === B) return true;
    if (A == null || B == null) return false;
    if (A.length != B.length) return false;
    for (let i=0; i < A.length; i++) {
        if (A[i].genotype !== B[i].genotype) return false;
    }
    return true;
} // }}}

function list_gcd(nums) { // {{{
    var run_gcd = [];
    nums.forEach(num => {
        run_gcd.push(num);
        if (run_gcd.length == 2) {
            let new_gcd = FractionReduce.getGCD(run_gcd.shift(), run_gcd.shift());
            run_gcd.push(new_gcd);
        }
    });
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

function breed_multiple(list_a, list_b) { // {{{
    var all_counts = {};
    var freq_a = {};
    var freq_b = {};
    if (breed_mode == 'clones') {
        list_a = list_a.concat(list_b || []);
        list_b = list_a;
    }
    list_a.forEach(A => freq_a[A.genotype] = (freq_a[A.genotype] || 0) + 1);
    list_b.forEach(B => freq_b[B.genotype] = (freq_b[B.genotype] || 0) + 1);
    Object.keys(freq_a).forEach((A, i) => {
        Object.keys(freq_b).forEach((B, j) => {
            let should_breed = (breed_mode == 'all' || (breed_mode == 'clones' && i == j));
            if (should_breed) {
                let counts = breed(A, B);
                if (breed_mode == 'all') {
                    var freq_multiplier = freq_a[A] * freq_b[B];
                } else {
                    var freq_multiplier = freq_a[A];
                }
                for (let genome in counts) {
                    all_counts[genome] = (all_counts[genome] || 0) + counts[genome] * freq_multiplier;
                }
            }
        });
    });
    return all_counts;
} // }}}

function get_flowers() { // {{{
    return document.querySelectorAll('div.varieties > div');
} // }}}

function clear_offspring() { // {{{
    var flowers = get_flowers();
    flowers.forEach(flower => {
        delete flower.dataset.count;
        flower.querySelectorAll('.result').forEach(result => flower.removeChild(result));
    });
} // }}}

function show_offspring(genome_counts) { // {{{
    clear_offspring();
    var flowers = get_flowers();
    var mode = document.querySelector('button#prob_mode').dataset.state;
    var disp_func = {
        '0': fraction_genomes_like,
        '1': fraction_genomes_reduced,
        '2': fraction_genomes_percent
    }[mode]
    var offspring = disp_func(genome_counts);
    flowers.forEach(function(flower) {
        var genome = flower.title;
        flower.dataset.count = genome_counts[genome] || 0;
        if (genome in offspring) {
            var result_div = document.createElement('div');
            result_div.classList.add('result');
            if (mode === "2") {
                result_div.dataset.percentage = offspring[genome][0];
            } else {
                result_div.dataset.numerator = offspring[genome][0];
                result_div.dataset.denominator = offspring[genome][1];
            }
            flower.appendChild(result_div);
        }
    });
} // }}}

function flower_obj(element_or_genotype) { // {{{
    if (element_or_genotype instanceof HTMLElement) {
        var element = element_or_genotype;
        var genotype = element.title;
    } else if (typeof element_or_genotype == 'string') {
        var genotype = element_or_genotype;
        var selector = 'div.varieties [title="' + genotype + '"]';
        var element = document.querySelector(selector);
    }
    if (genotype in flower_objects) {
        return flower_objects[genotype];
    }
    let obj = {
        'element': element,
        'genotype': genotype
    }
    flower_objects[genotype] = obj;
    return obj
} // }}}

function clear_parents() { // {{{
    var flowers = get_flowers();
    flowers.forEach(flower => {
        flower.querySelectorAll('.parentA').forEach(parent_div => flower.removeChild(parent_div));
        flower.querySelectorAll('.parentB').forEach(parent_div => flower.removeChild(parent_div));
        flower.querySelectorAll('.parentC').forEach(parent_div => flower.removeChild(parent_div));
    });
} // }}}

function mark_parent(group, flower, label) { // {{{
    var css_class = 'parent' + label;
    var selector = '.' + css_class;
    var count = group.filter(fl => fl.genotype == flower.genotype).length;
    var a_div = flower.element.querySelector(selector) || document.createElement('div');
    a_div.classList.add(css_class);
    a_div.innerHTML = '<div>' + (group.length == 1 ? label : String(count) + label) + '</div>';
    flower.element.appendChild(a_div);
} // }}}

function mark_parents(A, B) { // {{{
    if (breed_mode == 'all') {
        var pool = selected[0];
        var label = 'A';
    } else if (breed_mode == 'clones') {
        if (pools_equal(A, B)) {
            var pool = A;
        } else {
            var pool = A.concat(B || []);
        }
        var label = 'C';
    }
    a_items = [...new Set(pool)];
    a_items.forEach(flower => mark_parent(pool, flower, label));
    if (breed_mode == 'all') {
        b_items = [...new Set(B)];
        b_items.forEach(flower => mark_parent(selected[1], flower, 'B'));
    }
} // }}}

function select_flower(flower, add_to_selection) { // {{{
    if (add_to_selection) {
        selected[0] = selected[0] || [];
        if (breed_mode == 'all') {
            let group = selected[1] || selected[0];
            group.push(flower);
        } else if (breed_mode == 'clones') {
            selected[1] = selected[1] || [];
            selected[0].push(flower);
            selected[1].push(flower);
        }
    } else {
        if (breed_mode == 'all') {
            selected.push([flower]);
            if (selected.length > 2) {
                selected = [[flower]];
            }
        } else if (breed_mode == 'clones') {
            selected = [[flower], [flower]];
        }
    }
} // }}}

function flower_click(evt) { // {{{
    evt.preventDefault();
    evt.stopPropagation();
    var flower = flower_obj(evt.target);
    var add_to_selection = evt.ctrlKey;
    select_flower(flower, add_to_selection);
    clear_parents();
    if (selected.length < 2) {
        mark_parents(selected[0]);
        return false;
    }
    mark_parents(selected[0], selected[1]);
    var offspring = breed_multiple(selected[0], selected[1]);
    show_offspring(offspring);
    return false;
} // }}}

function section_click(evt) { // {{{
    selected = [];
    clear_parents();
    clear_offspring();
    return false;
} // }}}

function href_breed(genotypes_a, genotypes_b) { // {{{
    var parents_a = genotypes_a.map(g => flower_obj(g))
    var parents_b = genotypes_b.map(g => flower_obj(g))
    clear_parents();
    selected = [parents_a, parents_b];
    mark_parents(selected[0], selected[1]);
    var offspring = breed_multiple(selected[0], selected[1]);
    show_offspring(offspring);
    return false;
} // }}}

function parse_genespecs(genespecs_string) { // {{{
    var genespecs = genespecs_string.split(',');
    var genotypes = []
    genespecs.forEach(genespec => {
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
        for (let i=0; i < copies; i++) {
            genotypes.push(genotype);
        }
    });
    return genotypes;
} // }}}

function parse_pools(pools_string) { // {{{
    var pools = pools_string.split('|');
    if (pools.length == 1 || (pools.length == 2 && pools[1] === '')) {
        pools[1] = pools[0];
    }
    return pools.map(p => parse_genespecs(p));
} // }}}

function set_breed_mode(mode) { // {{{
    var states = {
        'all': 'Breeding: <span class="vcfont">×</span>&nbsp;All&nbsp;Combos',
        'clones': 'Breeding: <span class="vcfont">⊙</span>&nbsp;Clones&nbsp;Only'};
    var states_list = Object.keys(states);
    var button = document.querySelector('button#breed_mode');
    if (mode === undefined) {
        let next_mode = (Number(button.dataset.state) + 1) % states_list.length;
        breed_mode = states_list[next_mode];
    } else {
        breed_mode = mode;
    }
    button.dataset.state = states_list.indexOf(breed_mode);
    button.innerHTML = states[breed_mode];
} // }}}

function breed_link_click(evt) { // {{{
    var button = evt.target.closest('.breed');
    var parent_divs = button.querySelectorAll('.parent');
    if (parent_divs.length == 2) {
        var genotypes = Array.from(parent_divs, div => parse_genespecs(div.title));
    } else {
        genotypes = [[], []];
        parent_divs.forEach(div => {
            let pool = Number(div.dataset.pool);
            genotypes[pool] = genotypes[pool].concat(parse_genespecs(div.title));
        });
    }
    set_breed_mode(button.dataset.mode || 'all');
    evt.preventDefault();
    evt.stopPropagation();
    href_breed(genotypes[0], genotypes[1]);
} // }}}

function repeat_button_click(evt) { // {{{
    var button = evt.target.closest('button[title]');
    var offspring = parse_genespecs(button.title);
    var flowers = document.querySelectorAll('div.varieties > div[data-count]:not([data-count="0"])');
    var count_list = [];
    flowers.forEach(flower => {
        if (offspring.includes(flower.title)) {
            count_list.push(Number(flower.dataset.count));
        }
    });
    var gcd = list_gcd(count_list);
    var parents = [];
    flowers.forEach(flower => {
        if (offspring.includes(flower.title)) {
            let quantity = Number(flower.dataset.count) / gcd;
            for (let i=0; i < quantity; i++) {
                parents.push(flower.title);
            }
        }
    });
    evt.preventDefault();
    evt.stopPropagation();
    if (parents.length == 0) {
        return false;
    }
    href_breed(parents, parents);
} // }}}

function set_species(species) { // {{{
    var section = document.querySelector('section');
    selected = [];
    flower_objects = {};
    clear_parents();
    clear_offspring();
    species_buttons.forEach(function(button, i) {
        button.classList.remove('selected');
        section.classList.remove(button.classList[0]);
    });
    document.querySelector('div.species_menu button.' + species).classList.add('selected');
    section.classList.add(species);
} // }}}

function highlight_varieties(evt) { // {{{
    var icon = evt.target.closest('[title]');
    if (icon === null) {
        return false;
    }
    var genespecs = parse_genespecs(icon.title);
    var selector = '[title="' + [...new Set(genespecs)].join('"], [title="');
    document.querySelectorAll(selector).forEach(el => el.classList.add('highlighted'));
} // }}}

function unhighlight_varieties(evt) { // {{{
    var icon = evt.target.closest('[title]');
    if (icon === null) {
        return false;
    }
    var genespecs = parse_genespecs(icon.title);
    var selector = '[title="' + [...new Set(genespecs)].join('"], [title="');
    document.querySelectorAll(selector).forEach(el => el.classList.remove('highlighted'));
} // }}}

var species_buttons = document.querySelectorAll('div.species_menu button');
species_buttons.forEach(function(el, i) {
    el.addEventListener('click', function(evt) {
        var species = evt.target.closest('button').classList[0];
        set_species(species);
    });
});

var sections = document.querySelectorAll('section');
sections.forEach(function(el, i) {
    el.addEventListener('click', section_click);
});

var varieties = document.querySelectorAll('div.varieties > div');
varieties.forEach(function(el, i) {
    el.addEventListener('click', flower_click);
});

var breed_links = document.querySelectorAll('.breed');
breed_links.forEach(function(el, i) {
    el.addEventListener('click', breed_link_click);
});

var repeat_buttons = document.querySelectorAll('button.repeat');
repeat_buttons.forEach(function(el, i) {
    el.addEventListener('click', repeat_button_click);
});

var breed_icons = document.querySelectorAll('div.breed .parent, div.breed .offspring, button.repeat');
breed_icons.forEach(element => element.addEventListener('mouseover', highlight_varieties));
breed_icons.forEach(element => element.addEventListener('mouseout', unhighlight_varieties));

document.querySelector('button#toggle_help').addEventListener('click', evt => {
    document.querySelector('div#help').classList.toggle('rolled_up');
    evt.preventDefault();
    evt.stopPropagation();
});

document.querySelector('button#prob_mode').addEventListener('click', evt => {
    var states = [
        'Probabilities: Like&nbsp;Fractions',
        'Probabilities: Reduced&nbsp;Fracs',
        'Probabilities: Percentages'];
    evt.target.dataset.state = (Number(evt.target.dataset.state) + 1) % states.length;
    evt.target.innerHTML = states[evt.target.dataset.state];
    if (selected[0] !== undefined && (selected[1] !== undefined || breed_mode == 'clones')) {
        var offspring = breed_multiple(selected[0], selected[1]);
        show_offspring(offspring);
    }
    evt.preventDefault();
    evt.stopPropagation();
});

document.querySelector('button#breed_mode').addEventListener('click', evt => {
    clear_parents();
    set_breed_mode();
    if (selected[0] !== undefined) {
        if (selected[1] !== undefined || breed_mode == 'clones') {
            mark_parents(selected[0], selected[1]);
            var offspring = breed_multiple(selected[0], selected[1]);
            show_offspring(offspring);
        } else {
            clear_offspring();
            mark_parents(selected[0]);
        }
    }
    evt.preventDefault();
    evt.stopPropagation();
});

document.querySelector('button#condensed_view').addEventListener('click', evt => {
    var states = ['Rose&nbsp;View: Full', 'Rose&nbsp;View: Condensed'];
    evt.target.dataset.state = (Number(evt.target.dataset.state) + 1) % states.length;
    evt.target.innerHTML = states[evt.target.dataset.state];
    document.querySelector('section').classList.toggle('condensed');
    evt.preventDefault();
    evt.stopPropagation();
});
