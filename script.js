var selected = [];

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
    mark_parents(A, B);
    var genes_a = A.genotype.match(/.{2}/g);
    var genes_b = B.genotype.match(/.{2}/g);
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
                console.log(combination);
                possibilities[i].push(combination);
            }
        }
    }
    var genomes = possibilities.shift();
    while (possibilities.length) {
        suffixes = possibilities.shift();
        genomes = multiply(genomes, suffixes);
    }
    var total_genomes = genomes.length;
    var genome_counts = {}
    for (var i=0; i < total_genomes; i++) {
        var genome = genomes[i];
        if (genome in genome_counts) {
            genome_counts[genome] += 1;
        } else {
            genome_counts[genome] = 1;
        }
    }
    var genome_fracs = {}
    for (var genome in genome_counts) {
        var frac = FractionReduce.reduce(genome_counts[genome], total_genomes);
        genome_fracs[genome] = frac;
    }
    console.log(genomes);
    console.log(genome_counts);
    console.log(genome_fracs);
    return genome_fracs;
} // }}}

function get_species_flowers(species) { // {{{
    return document.querySelectorAll('section.' + species + ' div.varieties > div');
} // }}}

function clear_offspring(species) { // {{{
    var flowers = get_species_flowers(species);
    flowers.forEach(function(flower) {
        flower.innerHTML = '';
        flower.classList.remove('impossible');
    });
} // }}}

function show_offspring(species, offspring) { // {{{
    clear_offspring(species);
    var flowers = get_species_flowers(species);
    flowers.forEach(function(flower) {
        var genome = flower.classList[0];
        if (genome in offspring) {
            var result_div = document.createElement('div');
            result_div.classList.add('result');
            result_div.innerHTML = '<div>' + String(offspring[genome][0]) + '</div><div>' + String(offspring[genome][1]) + '</div>';
            flower.appendChild(result_div);
        } else {
            flower.classList.add('impossible');
        }
    });
} // }}}

function flower_obj(element) { // {{{
    return {
        'element': element,
        'species': element.closest('section').classList[0],
        'genotype': element.classList[0]
    }
} // }}}

function clear_parents(species) { // {{{
    var flowers = get_species_flowers(species);
    flowers.forEach(function(flower, i) {
        flower.classList.remove('parentA');
        flower.classList.remove('parentB');
    });
} // }}}

function mark_parents(A, B) { // {{{
    A.element.classList.add('parentA');
    if (B !== undefined) {
        B.element.classList.add('parentB');
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
    selected.push(flower);
    if (selected.length > 2) {
        selected = [flower];
    } else if (selected.length == 2 && selected[0].species != selected[1].species) {
        selected.shift();
    }
    if (selected.length < 2) {
        clear_parents(species);
        mark_parents(selected[0]);
        return false;
    }
    console.log('Breeding ' + selected[0].genotype + ' with ' + selected[1].genotype);
    offspring = breed(selected[0], selected[1]);
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

function href_breed(species, genotype_a, genotype_b) { // {{{
    var flower_a = flower_obj(document.querySelector('section.' + species + ' div.' + genotype_a));
    var flower_b = flower_obj(document.querySelector('section.' + species + ' div.' + genotype_b));
    selected = [flower_a, flower_b];
    clear_parents(species);
    console.log(flower_a.genotype);
    console.log(flower_b.genotype);
    var offspring = breed(flower_a, flower_b);
    show_offspring(species, offspring);
    return false;
} // }}}

function breed_link_click(evt) { // {{{
    evt.preventDefault();
    evt.stopPropagation();
    var species = evt.target.closest('section').classList[0];
    var genotypes = evt.target.dataset.parents.split(',');
    href_breed(species, genotypes[0], genotypes[1]);
} // }}}

function set_species(species) {
    var clicked_button = undefined;
    var section = document.querySelector('section');
    var old_species = section.classList[0];
    selected = [];
    clear_parents(old_species);
    clear_offspring(old_species);
    species_buttons.forEach(function(button, i) {
        button.classList.remove('selected');
        if (button.classList.contains(species)) {
            clicked_button = button;
        }
        section.classList.remove(button.classList[0]);
    });
    clicked_button.classList.add('selected');
    section.classList.add(clicked_button.classList[0]);
    document.querySelector('section h3').innerHTML = clicked_button.classList[0];
}

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

var breed_links = document.querySelectorAll('span.breed');
breed_links.forEach(function(el, i) {
    el.addEventListener('click', breed_link_click);
});

document.querySelector('button#boring_rose_toggle').addEventListener('click', function() {
    document.querySelector('section').classList.toggle('condensed');
});
