var flowers = document.querySelectorAll('div.varieties > div');
var pools_with_flowers = 0;
var breed_mode = 'all';
const breed_lookup = [
    ['0000', '1010', '1111'],
    ['1010', '2110', '2121'],
    ['1111', '2121', '2222']
];

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

function breed_multiple() { // {{{
    var all_counts = {};
    for (let A of flowers) {
        for (let B of flowers) {
            let freq_all = (A.dataset.A || 0) * (B.dataset.B || 0);
            let freq_clones = A.dataset.C || 0;
            let should_breed_all = (breed_mode == 'all' && freq_all > 0);
            let should_breed_clones = (breed_mode == 'clones' && A == B && freq_clones > 0)
            if (should_breed_all || should_breed_clones) {
                let counts = breed(A.title, B.title);
                if (breed_mode == 'all') {
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
    if (Object.entries(all_counts).length) {
        set_fragment();
    }
    return all_counts;
} // }}}

function clear_offspring() { // {{{
    for (let flower of flowers) {
        delete flower.dataset.count;
        flower.querySelectorAll('.result').forEach(result => flower.removeChild(result));
    }
} // }}}

function show_offspring(genome_counts) { // {{{
    if (Object.keys(genome_counts).length == 0) {
        return false;
    }
    clear_offspring();
    var mode = document.querySelector('button#prob_mode').dataset.state;
    var disp_func = {
        '0': fraction_genomes_like,
        '1': fraction_genomes_reduced,
        '2': fraction_genomes_percent
    }[mode]
    var offspring = disp_func(genome_counts);
    for (let flower of flowers) {
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
    }
    return true;
} // }}}

function clear_parents() { // {{{
    for (let flower of flowers) {
        delete flower.dataset.A;
        delete flower.dataset.B;
        delete flower.dataset.C;
    }
    pools_with_flowers = 0;
} // }}}

function select_flower(pool, flower, quantity) { // {{{
    var new_qty = {};
    if (quantity === undefined) {
        new_qty['A'] = (Number(flower.dataset.A) || 0) + 1;
        new_qty['B'] = (Number(flower.dataset.B) || 0) + 1;
    } else {
        new_qty['A'] = quantity;
        new_qty['B'] = quantity;
    }
    if (breed_mode == 'all') {
        flower.dataset[pool] = new_qty[pool];
        pools_with_flowers = {'A': 1, 'B': 2}[pool];
    } else {
        flower.dataset.A = new_qty['A'];
        flower.dataset.B = new_qty['B'];
        pools_with_flowers = 2;
    }
} // }}}

function set_pool_C() { // {{{
    var same = true;
    for (let flower of flowers) {
        if ((flower.dataset.A || 0) != (flower.dataset.B || 0)) {
            same = false;
            break;
        }
    }
    for (let flower of [...flowers].filter(f => f.dataset.A !== undefined || f.dataset.B !== undefined)) {
        if (same) {
            flower.dataset.C = flower.dataset.A;
        } else {
            let new_C = Number(flower.dataset.A || 0) + Number(flower.dataset.B || 0)
            console.log('new_C', new_C);
            flower.dataset.C = new_C;
        }
    }
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

function set_fragment() { // {{{
    var counts_A = {};
    var counts_B = {};
    for (let flower of flowers) {
        if ((flower.dataset.A || 0) > 0) {
            counts_A[flower.title] = flower.dataset.A;
        }
        if ((flower.dataset.B || 0) > 0) {
            counts_B[flower.title] = flower.dataset.B;
        }
    }
    var species = document.querySelector('section').dataset.species;
    var pool_A = encode_genespecs(counts_A);
    var pool_B = encode_genespecs(counts_B);
    var pools = pool_A;
    if (pool_A != pool_B) {
        pools += '|' + pool_B;
    }
    var hash = species + '/' + pools;
    if (breed_mode == 'clones') {
        hash += '/clones';
    }
    history.replaceState(null, null, document.location.pathname + '#' + hash);
} // }}}

function flower_click(evt) { // {{{
    evt.preventDefault();
    evt.stopPropagation();
    var flower = evt.target.closest('[title]');
    var add_to_selection = evt.ctrlKey;
    var max_pools = breed_mode == 'clones' ? 1 : 2;
    var should_clear = !add_to_selection && (pools_with_flowers >= max_pools);
    if (should_clear) {
        clear_parents();
    }
    var pool = Math.max(0, pools_with_flowers - (add_to_selection ? 1 : 0));
    select_flower(['A', 'B'][pool], flower);
    if (breed_mode == 'clones') {
        set_pool_C();
    }
    var offspring = breed_multiple();
    show_offspring(offspring);
    return false;
} // }}}

function section_click(evt) { // {{{
    var species = document.querySelector('section').dataset.species;
    history.replaceState(null, null, document.location.pathname + '#' + species);
    clear_parents();
    clear_offspring();
    return false;
} // }}}

function set_pools(pools) { // {{{
    clear_parents();
    for (let pool of ['A', 'B']) {
        for (let entry of Object.entries(pools[pool])) {
            let flower = document.querySelector('[title="' + entry[0] + '"]');
            select_flower(pool, flower, entry[1]);
        }
    }
    return false;
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
    var section = document.querySelector('section');
    section.dataset.breedMode = breed_mode;
    button.dataset.state = states_list.indexOf(breed_mode);
    button.innerHTML = states[breed_mode];
} // }}}

function breed_link_click(evt) { // {{{
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
    set_breed_mode(button.dataset.mode || 'all');
    set_pools(pools);
    if (breed_mode == 'clones') {
        set_pool_C();
    }
    var offspring = breed_multiple();
    show_offspring(offspring);
    document.querySelector('section').scrollIntoView();
    evt.preventDefault();
    evt.stopPropagation();
} // }}}

function repeat_button_click(evt) { // {{{
    var button = evt.target.closest('button[title]');
    var offspring = parse_genespecs(button.title);
    var flowers = document.querySelectorAll('div.varieties > div[data-count]:not([data-count="0"])');
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
    set_pools({'A': parents, 'B': parents});
    if (breed_mode == 'clones') {
        set_pool_C();
    }
    var offspring = breed_multiple();
    show_offspring(offspring);
} // }}}

function set_species(species) { // {{{
    var section = document.querySelector('section');
    clear_parents();
    clear_offspring();
    species_buttons.forEach(function(button, i) {
        button.classList.remove('selected');
    });
    document.querySelector('div.species_menu button.' + species).classList.add('selected');
    section.dataset.species = species;
} // }}}

function highlight_varieties(evt) { // {{{
    var icon = evt.target.closest('[title]');
    if (icon === null) {
        return false;
    }
    var genespecs = parse_genespecs(icon.title);
    var selector = '[title="' + Object.keys(genespecs).join('"], [title="');
    document.querySelectorAll(selector).forEach(el => el.classList.add('highlighted'));
} // }}}

function unhighlight_varieties(evt) { // {{{
    var icon = evt.target.closest('[title]');
    if (icon === null) {
        return false;
    }
    var genespecs = parse_genespecs(icon.title);
    var selector = '[title="' + Object.keys(genespecs).join('"], [title="');
    document.querySelectorAll(selector).forEach(el => el.classList.remove('highlighted'));
} // }}}

function use_fragment() { // {{{
    var options = parse_fragment(window.location.hash);
    console.log(options);
    if ('species' in options) {
        set_species(options['species']);
    }
    if ('pools' in options) {
        set_pools(options['pools']);
    }
    if ('breed_mode' in options) {
        set_breed_mode(options['breed_mode']);
        if (breed_mode == 'clones') {
            set_pool_C();
        }
    }
    var offspring = breed_multiple();
    show_offspring(offspring);
} // }}}

var species_buttons = document.querySelectorAll('div.species_menu button');
species_buttons.forEach(function(el, i) {
    el.addEventListener('click', function(evt) {
        var species = evt.target.closest('button').classList[0];
        set_species(species);
        history.replaceState(null, null, document.location.pathname + '#' + species);
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
    var offspring = breed_multiple();
    show_offspring(offspring);
    evt.preventDefault();
    evt.stopPropagation();
});

document.querySelector('button#breed_mode').addEventListener('click', evt => {
    set_breed_mode();
    if (breed_mode == 'clones') {
        set_pool_C();
    }
    var offspring = breed_multiple();
    show_offspring(offspring) || clear_offspring();
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

window.addEventListener('hashchange', use_fragment);
use_fragment();
