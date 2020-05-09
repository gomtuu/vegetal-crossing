var selected = [];
var flower_objects = {};

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
    var genes_a = A.match(/.{2}/g);
    var genes_b = B.match(/.{2}/g);
    var possibilities = [];
    for (var i=0; i < genes_a.length; i++) {
        possibilities[i] = [];
        for (var j=0; j < 2; j++) {
            for (var k=0; k < 2; k++) {
                allele_a = genes_a[i][j];
                allele_b = genes_b[i][k];
                var combination = allele_a + allele_b;
                if (allele_a > allele_b) {
                    combination = allele_b + allele_a;
                }
                possibilities[i].push(combination);
            }
        }
    }
    var genomes = possibilities.shift();
    while (possibilities.length) {
        suffixes = possibilities.shift();
        genomes = multiply(genomes, suffixes);
    }
    var genome_counts = {}
    for (var i=0; i < genomes.length; i++) {
        var genome = genomes[i];
        if (genome in genome_counts) {
            genome_counts[genome] += 1;
        } else {
            genome_counts[genome] = 1;
        }
    }
    return genome_counts;
} // }}}

function fraction_genomes_like(genome_counts) { // {{{
    var genome_fracs = {}
    var run_gcd = [];
    var total_genomes = 0;
    for (let genome in genome_counts) {
        run_gcd.push(genome_counts[genome]);
        if (run_gcd.length == 2) {
            new_gcd = FractionReduce.getGCD(run_gcd.shift(), run_gcd.shift());
            run_gcd.push(new_gcd);
        }
        total_genomes += genome_counts[genome];
    }
    var gcd = run_gcd[0];
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
    list_a.forEach(A => freq_a[A.genotype] = (freq_a[A.genotype] || 0) + 1);
    list_b.forEach(B => freq_b[B.genotype] = (freq_b[B.genotype] || 0) + 1);
    var mode = {
        '0': 'cross',
        '1': 'clone'
    }[document.querySelector('button#breed_mode').dataset.state];
    Object.keys(freq_a).forEach((A, i) => {
        Object.keys(freq_b).forEach((B, j) => {
            let should_breed = (mode == 'cross' || (mode == 'clone' && i == j));
            if (should_breed) {
                let counts = breed(A, B);
                if (mode == 'cross') {
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

function get_species_flowers(species) { // {{{
    return document.querySelectorAll('section.' + species + ' div.varieties > div');
} // }}}

function clear_offspring(species) { // {{{
    var flowers = get_species_flowers(species);
    flowers.forEach(flower => {
        flower.querySelectorAll('.result').forEach(result => flower.removeChild(result));
        flower.classList.remove('impossible');
    });
} // }}}

function show_offspring(species, genome_counts) { // {{{
    clear_offspring(species);
    var flowers = get_species_flowers(species);
    var mode = document.querySelector('button#prob_mode').dataset.state;
    var offspring = {
        '0': fraction_genomes_like,
        '1': fraction_genomes_reduced,
        '2': fraction_genomes_percent
    }[mode](genome_counts);
    flowers.forEach(function(flower) {
        var genome = flower.classList[0];
        if (genome in offspring) {
            var result_div = document.createElement('div');
            result_div.classList.add('result');
            if (mode === "2") {
                result_div.innerHTML = '<div>' + String(offspring[genome][0]) + '</div>';
            } else {
                result_div.innerHTML = '<div>' + String(offspring[genome][0]) + '</div><div>' + String(offspring[genome][1]) + '</div>';
            }
            flower.appendChild(result_div);
        } else {
            flower.classList.add('impossible');
        }
    });
} // }}}

function flower_obj(element) { // {{{
    var genotype = element.classList[0];
    if (genotype in flower_objects) {
        return flower_objects[genotype];
    }
    let obj = {
        'element': element,
        'species': element.closest('section').classList[0],
        'genotype': element.classList[0]
    }
    flower_objects[genotype] = obj;
    return obj
} // }}}

function clear_parents(species) { // {{{
    var flowers = get_species_flowers(species);
    flowers.forEach(flower => {
        flower.querySelectorAll('.parentA').forEach(parent_div => flower.removeChild(parent_div));
        flower.querySelectorAll('.parentB').forEach(parent_div => flower.removeChild(parent_div));
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
    a_items = [...new Set(A)];
    a_items.forEach(flower => mark_parent(selected[0], flower, 'A'));
    b_items = [...new Set(B)];
    b_items.forEach(flower => mark_parent(selected[1], flower, 'B'));
} // }}}

function select_flower(flower, add_to_selection) { // {{{
    if (add_to_selection) {
        selected[0] = selected[0] || [];
        let group = selected[1] || selected[0];
        group.push(flower);
    } else {
        selected.push([flower]);
        if (selected.length > 2) {
            selected = [[flower]];
        }
    }
} // }}}

function flower_click(evt) { // {{{
    evt.preventDefault();
    evt.stopPropagation();
    var flower = flower_obj(evt.target);
    var species = flower.species;
    if (species == undefined) {
        return false;
    }
    var add_to_selection = evt.ctrlKey;
    select_flower(flower, add_to_selection);
    if (selected.length < 2) {
        clear_parents(species);
        mark_parents(selected[0]);
        return false;
    }
    mark_parents(selected[0], selected[1]);
    var offspring = breed_multiple(selected[0], selected[1]);
    show_offspring(species, offspring);
    return false;
} // }}}

function section_click(evt) { // {{{
    var species = evt.target.closest('section').classList[0];
    selected = [];
    clear_parents(species);
    clear_offspring(species);
    return false;
} // }}}

function href_breed(species, genotypes_a, genotypes_b) { // {{{
    var parents_a = genotypes_a.map(g => flower_obj(document.querySelector('section.' + species + ' div.' + g)))
    var parents_b = genotypes_b.map(g => flower_obj(document.querySelector('section.' + species + ' div.' + g)))
    clear_parents(species);
    selected = [parents_a, parents_b];
    mark_parents(selected[0], selected[1]);
    var offspring = breed_multiple(selected[0], selected[1]);
    show_offspring(species, offspring);
    return false;
} // }}}

function breed_link_click(evt) { // {{{
    var species = evt.target.closest('section').classList[0];
    var button_data = evt.target.closest('.breed').dataset;
    if (button_data.parents === undefined) {
        return false;
    }
    evt.preventDefault();
    evt.stopPropagation();
    var pools = button_data.parents.split('|');
    if (pools.length == 1 || (pools.length == 2 && pools[1] === '')) {
        pools[1] = pools[0];
    }
    var pools_split = [pools[0].split(','), pools[1].split(',')];
    var genotypes = [];
    pools_split.forEach(pool => {
        var pool_genos = []
        pool.forEach(genespec => {
            let parts = genespec.split(':');
            let copies = 0;
            let genotype = undefined;
            if (isNaN(parts[0])) {
                copies = 1;
                genotype = parts[0];
            } else {
                copies = parts[0];
                genotype = parts[1];
            }
            for (let i=0; i < copies; i++) {
                pool_genos.push(genotype);
            }
        });
        genotypes.push(pool_genos);
    });
    href_breed(species, genotypes[0], genotypes[1]);
} // }}}

function set_species(species) { // {{{
    var section = document.querySelector('section');
    var old_species = section.classList[0];
    selected = [];
    flower_objects = {};
    clear_parents(old_species);
    clear_offspring(old_species);
    species_buttons.forEach(function(button, i) {
        button.classList.remove('selected');
        section.classList.remove(button.classList[0]);
    });
    document.querySelector('div.species_menu button.' + species).classList.add('selected');
    section.classList.add(species);
} // }}}

function highlight_varieties(evt) { // {{{
    var icon = evt.target.closest('div[data-genotypes]');
    if (icon === null) {
        return false;
    }
    var selector = '.' + icon.dataset.genotypes.replace(/,/g, ', .');
    document.querySelectorAll(selector).forEach(el => el.classList.add('highlighted'));
} // }}}

function unhighlight_varieties(evt) { // {{{
    var icon = evt.target.closest('div[data-genotypes]');
    if (icon === null) {
        return false;
    }
    var selector = '.' + icon.dataset.genotypes.replace(/,/g, ', .');
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

var breed_icons = document.querySelectorAll('div.breed .parent, div.breed .offspring');
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
        'Probabilities: Reduced&nbsp;Fractions',
        'Probabilities: Percentages'];
    evt.target.dataset.state = (Number(evt.target.dataset.state) + 1) % states.length;
    evt.target.innerHTML = states[evt.target.dataset.state];
    var species = evt.target.closest('section').classList[0];
    var offspring = breed_multiple(selected[0], selected[1]);
    show_offspring(species, offspring);
    evt.preventDefault();
    evt.stopPropagation();
});

document.querySelector('button#breed_mode').addEventListener('click', evt => {
    var states = [
        'Breeding: Standard',
        'Breeding: Clone'];
    evt.target.dataset.state = (Number(evt.target.dataset.state) + 1) % states.length;
    evt.target.innerHTML = states[evt.target.dataset.state];
    var species = evt.target.closest('section').classList[0];
    var offspring = breed_multiple(selected[0], selected[1]);
    show_offspring(species, offspring);
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
