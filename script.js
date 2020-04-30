var selected = [];

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
        possibilities[i] = {};
        for (var j=0; j < 2; j++) {
            for (var k=0; k < 2; k++) {
                allele_a = genes_a[i][j];
                allele_b = genes_b[i][k];
                var combination = allele_a + allele_b;
                if (allele_a > allele_b) {
                    combination = allele_b + allele_a;
                }
                console.log(combination);
                possibilities[i][combination] = true;
            }
        }
    }
    var genomes = Object.keys(possibilities.shift());
    while (possibilities.length) {
        suffixes = Object.keys(possibilities.shift());
        genomes = multiply(genomes, suffixes);
    }
    console.log(genomes);
    return genomes;
} // }}}

function get_species_flowers(species) { // {{{
    return document.querySelectorAll('section.' + species + ' div.varieties > div');
} // }}}

function show_result(species, offspring) { // {{{
    var flowers = get_species_flowers(species);
    flowers.forEach(function(flower) {
        if (offspring.includes(flower.classList[0])) {
            flower.classList.remove('impossible');
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

function handle_click(evt) { // {{{
    var flower = flower_obj(evt.target);
    var species = flower.species;
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
    show_result(species, offspring);
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
    show_result(species, offspring);
} // }}}

var varieties = document.querySelectorAll('div.varieties > div');
varieties.forEach(function(el, i) {
    el.addEventListener('click', handle_click);
});
