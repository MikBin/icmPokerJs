/**
 *@module icm
 * Created by Michele Bini on 6/9/13.
 * library for poker independent chip model computing
 */



/**
 *UMD wrapper, it works with commonJS(nodejs), global/namespaced browser side and AMD (RequireJS)
 *
 *@param name {String} name of the module as it will be exposed
 *@param definition {Function} the factory containing the library code
 *@param context {Object} the context where the library is loaded
 *@param dependencies {Array} array of strings of dependencies in amd-like structure
 *@param nameSpace {Object} used only browser side (no amd case) to avoid globals
 *@return {Object} return definition executed in the right context with dependencies resolved
 */
(function(name, definition, context, dependencies, nameSpace) {

    if (typeof module === 'object' && module['exports']) {
        if (dependencies && require) {

            /*store dependencies here*/
            var deps = {};
            for (var i = 0; i < dependencies.length; i++) {

                deps[dependencies[i]] = require(dependencies[i]);
            }
        }
        /*to avoid circular dependencies issues in nodejs, the object pointed by module.exports is passed to the factory*/
        return definition.call(deps, module['exports']);

    } else if ((typeof context['define'] !== 'undefined') && (typeof context['define'] === 'function') && context['define']['amd']) {
        define(name, (dependencies || []), function() {
            /*store dependencies here*/
            var strName, deps = {};

            for (var i = 0; i < dependencies.length; ++i) {
                strName = dependencies[i].split('/');
                strName = strName[strName.length - 1];
                deps[strName] = arguments[i];
            }
            return definition.call(deps);
        });
    } else {
        /*context is browser global; if nameSpace is defined, then bind the library to it*/
        if (nameSpace && context[nameSpace]) {

            context[nameSpace][name] = {};
            return definition(context[nameSpace][name], nameSpace);
        } else {
            context[name] = {};
            return definition(context[name]);
        }
    }
})('ICM', function(myself, nameSpace) {


    var ICM = myself || {};
    /*to avoid circular dependencies issues in nodejs-
     here, we append functions and properties to an already existing object (module.exports) created before that dependencies binding happened;*/
    var _context = this;
    console.log('-------------------------------logging this in icm library---------------------------------------');
    console.log(this);
    var _ = _context._ || _context.lodash || _context.underscore;
    var ĸø = _context.kombinatoricsJs;

    if (nameSpace) {
        /*look for dependencies in nameSpace too and overwrite if found*/
        _ = _context[nameSpace]._ || _context[nameSpace].lodash || _context[nameSpace].underscore || _;
        ĸø = _context[nameSpace].kombinatoricsJs || ĸø;
    }

    if (!_) {
        return console.error('module ICM is dependent on lodash/underscore, include it BEFORE this module');
    }

    if (!ĸø) {
        return console.error('module ICM is dependent on kombinatoricsJs, include it BEFORE this module');
    }


    var Deckidx = ĸø.indexArray;

    ICM.Deckidx = Deckidx;

    var shuffle = ĸø.shuffle;

    var rnd_bmt = ĸø.normalRandom.BoxMuller;

    var factorial = ĸø.factorial;

    var permutationNumber = ĸø.pNK;

    var binomIncrement = ĸø.binomIncrement;


    ICM.factorial = factorial;
    ICM.permutationNumber = permutationNumber;
    ICM.binomIncrement = binomIncrement;

    function swap(items, i, j) {
        var temp = items[i];
        items[i] = items[j];
        items[j] = temp;
    }

    function heapPermute(n, items, begin, end, refArr, totStacks, prizeRef) {
        if (n === 1) {

            addPartialEv(begin, end, items, refArr, totStacks, prizeRef);

        } else {

            for (var i = 0; i < n; ++i) {
                heapPermute(n - 1, items, begin, end, refArr, totStacks, prizeRef);
                if (n % 2 === 1) {
                    swap(items, 0, n - 1);
                } else {
                    swap(items, i, n - 1);
                }
            }
        }
    }

    ICM.heapPermute = heapPermute;

    function addPartialEv(begin, end, idxsArr, refArr, totStacks, prizeRef) {
        var partialSum = totStacks,
            p = 1,
            currentStack, currentPly;
        for (var i = begin; i < end; ++i) {

            currentStack = refArr[idxsArr[i]].stack;
            p *= currentStack / partialSum;
            partialSum -= currentStack;

        }

        /*adding up ev share for this combo*/
        var j = 0;
        for (i = begin; i < end; ++i) {
            refArr[idxsArr[i]].ev += prizeRef[j] * p;
            j++;
        }
    }

    ICM.addPartialEv = addPartialEv;

    function icmSym(idxsArr, refArr, totStacks, prizes, cycles) {
        var idxs = new Deckidx(idxsArr),
            i, j,
            idxsArray = idxs.getArray(),
            nPrize = prizes.length,
            l = idxsArr.length - nPrize;
        for (i = 0; i < cycles; ++i) {
            idxs.shuffle();
            for (j = 0; j < l; ++j) {
                addPartialEv(j, j + nPrize, idxsArray, refArr, totStacks, prizes);
            }
            if (l === 0) addPartialEv(0, nPrize, idxsArray, refArr, totStacks, prizes);
        }
    }

    ICM.icmSym = icmSym;

    function monteCarloICM(plyRef, totalChips, prizeRef, limit) {
        var pn = permutationNumber(plyRef.length, prizeRef.length);
        var pidxs = [];

        _.forEach(plyRef, function(ply, idx) {
            pidxs.push(idx);
        });

        var diffPrizePlayers = plyRef.length - prizeRef.length;
        diffPrizePlayers = diffPrizePlayers !== 0 ? diffPrizePlayers : 1;
        var totRnd = pn / (diffPrizePlayers === 0 ? 1 : diffPrizePlayers);
        var rate = totRnd;

        totRnd = totRnd > limit ? ~~(limit / diffPrizePlayers) : totRnd;
        rate /= totRnd;


        icmSym(pidxs, plyRef, totalChips, prizeRef, totRnd);

        _.forEach(plyRef, function(ply) {
            ply.ev *= rate;

        });

    }

    ICM.monteCarloICM = monteCarloICM;

    function bruteForceICM_temp(plyRef, totalChips, prizeRef) {
        var przidxs = [];
        _.forEach(prizeRef, function(ply, idx) {
            przidxs.push(idx);
        });

        /*compute them all*/
        while (true) {
            heapPermute(przidxs.length, przidxs.slice(), 0, przidxs.length, plyRef, totalChips, prizeRef); /*call from kombinatoricsjs and optimize*/
            if (!binomIncrement(przidxs, plyRef.length - 1)) { /*here use iterator*/
                break;
            }
        }
    }

    function bruteForceICM(plyRef, totalChips, prizeRef) {
        var przidxs = [];
        _.forEach(prizeRef, function(ply, idx) {
            przidxs.push(idx);
        });
        var citer = kombinatoricsJs.combinationsIterator(plyRef, przidxs.length);
        /*compute them all*/
        while (true) {
            kombinatoricsJs.heapPermute(przidxs.length, citer.getIndex(), function(items) {
                addPartialEv(0, przidxs.length, items, plyRef, totalChips, prizeRef);
            });
            if (!citer.next()) { /*here use iterator*/
                break;
            }
        }
    }

    ICM.bruteForceICM = bruteForceICM;

    function CreatePlayer(stack, name) {
        return {
            stack: stack ? stack : 0,
            name: name !== undefined ? name : '',
            ev: 0,
            chipev: 0,
            dealer: false,
            folded: false
        };
    }

    ICM.CreatePlayer = CreatePlayer;

    function genRndNormalStacks(mu, sigma, qty) {
        var out = [],
            tempStack;
        for (var i = 0; i < qty; ++i) {
            tempStack = ~~ (mu + sigma * rnd_bmt()[0]);
            out.push(CreatePlayer(tempStack > 0 ? tempStack : 1, out.length + 1));
        }

        return out;
    }

    ICM.genRndNormalStacks = genRndNormalStacks;


    var ns_rates = [{
            qty: 10,
            rate: 1.3
        }, {
            qty: 14,
            rate: 1.5
        }, {
            qty: 18,
            rate: 1.6
        }, {
            qty: 22,
            rate: 1.7
        }, {
            qty: 27,
            rate: 1.8
        }, {
            qty: 34,
            rate: 1.9
        }, {
            qty: 43,
            rate: 2.0
        }, {
            qty: 55,
            rate: 2.1
        }, {
            qty: 71,
            rate: 2.2
        }, {
            qty: 93,
            rate: 2.3
        }, {
            qty: 121,
            rate: 2.4
        }, {
            qty: 161,
            rate: 2.5
        }, {
            qty: 212,
            rate: 2.6
        }, {
            qty: 285,
            rate: 2.7
        }, {
            qty: 384,
            rate: 2.8
        }, {
            qty: 526,
            rate: 2.9
        }, {
            qty: 769,
            rate: 3.0
        }

    ];

    function TournamentStruct(players, prizes, n, stackAvg, sigma, maxStack, minStack) {
        this.totalChips = 0;
        this.players = Array.isArray(players) ? players : [];
        this.prizes = Array.isArray(prizes) ? prizes : [];
        this.prizesPercent = [];
        this.totalCash = 0;
        this.size = players.length;
        var self = this;
        if (this.prizes.length) {
            this.placePaid = this.prizes.length;
            _.forEach(self.prizes, function(el) {
                self.prizesPercent.push(0);
                self.totalCash += el;

            });

            _.forEach(self.prizes, function(el, idx) {

                self.prizesPercent[idx] = el / self.totalCash;
            });
        } else {
            self.placePaid = 0;
        }

        if (players.length === 0 || n && players.length < n) {
            /*then randomize using n,stackAvg,sigma*/
            var _sigma, rate = ns_rates;
            if (sigma) {
                _sigma = sigma;
            } else {
                _sigma = (maxStack - minStack) / 2;


                var i = 0,
                    r;
                while (i < rate.length) {
                    if (n < rate[i].qty) {
                        if (i === 0) {
                            r = rate[i].rate;
                            break;
                        } else {
                            r = rate[i - 1].rate;
                            break;
                        }
                    } else {
                        ++i;
                    }
                }
                if (i === rate.length) {
                    r = rate[i].rate;
                }

                _sigma /= r;


            }

            if (players.length === 0) {
                self.players = genRndNormalStacks(stackAvg, _sigma, n);
            } else {
                var tmpPlayers = genRndNormalStacks(stackAvg, _sigma, n - self.players.length);
                _.forEach(tmpPlayers, function(ply) {
                    self.players.push(ply);
                });
            }

        } else if (n && players.length > n) {
            var diff = players.length - n;
            /*tell the user to eliminate some player*/
        }

    }

    ICM.TournamentStruct = TournamentStruct;

    TournamentStruct.prototype.computeChipEvs = function(cyclesLimit) {
        var self = this,
            totalChips = self.totalChips,
            prizeRef = [],
            plyRef = self.players,
            pidxs = [],
            przidxs = [],
            max = 0,
            min = 999999999999999999,
            maxIdx, minIdx;

        self.computeTotChips();
        totalChips = self.totalChips;

        _.forEach(plyRef, function(ply, idx) {
            ply.ev = 0;
            pidxs.push(idx);

            if (ply.stack > max) {
                max = ply.stack;
                maxIdx = idx;
            }

            if (ply.stack < min) {
                min = ply.stack;
                minIdx = idx;
            }


            if (self.prizes[idx] > 0) {
                prizeRef.push(self.prizes[idx]);
                przidxs.push(idx);
            }
        });

        var pn = ICM.permutationNumber(plyRef.length, prizeRef.length);

        if (pn > cyclesLimit) {

            monteCarloICM(plyRef, totalChips, prizeRef, cyclesLimit);

        } else {

            bruteForceICM(plyRef, totalChips, prizeRef);
        }

        for (var i = 0; i < self.players.length; ++i) {
            self.players[i].chipev = self.players[i].ev / self.players[i].stack;

        }
    }

    TournamentStruct.prototype.getSelfClone = function() {
        var self = this,
            t;
        t = new TournamentStruct(_.cloneDeep(self.players), self.prizes.slice());
        t.computeTotChips();
        return t;
    }

    TournamentStruct.prototype.getPlayers = function() {
        return this.players;
    }

    TournamentStruct.prototype.getPrizes = function() {
        return this.prizes;
    }


    TournamentStruct.prototype.computeTotChips = function() {
        var self = this;
        this.totalChips = 0;
        _.forEach(self.players, function(el, idx) {
            self.totalChips += el.stack;
        });
    }

    TournamentStruct.prototype.computeTotPrize = function() {
        this.totalCash = 0;
        var self = this;
        _.forEach(self.prizes, function(prz) {
            self.totalCash += prz;
        });
    }

    TournamentStruct.prototype.computePrizesPercent = function() {

        var self = this;
        _.forEach(self.prizes, function(prz, idx) {
            self.prizesPercent[idx] = prz / self.totalCash;
        });
    }
    /*compute average stack variance max and min*/
    TournamentStruct.prototype.computeFigures = function() {}

    TournamentStruct.prototype.setTotalCashPrize = function(cash) {
        var oldCash = this.totalCash,
            remainingCash = cash - oldCash;
        this.totalCash = cash;
        return remainingCash;
    }

    TournamentStruct.prototype.setPlacePaid = function(n) {
        this.placePaid = n;
    }

    TournamentStruct.prototype.completePrizesFromTotal = function(minWinPercent, totPrize) {
        var self = this;
        self.computeTotPrize();
        var toBePaid = self.placePaid - self.prizes.length,
            amountToSpread = self.setTotalCashPrize(totPrize),
            buyin = self.totalCash / self.players.length,
            decreasingParameter, remains = amountToSpread,
            nextPrize, tbp;
        tbp = toBePaid - 1;
        if (tbp === 0) {
            decreasingParameter = 1;
        } else {
            decreasingParameter = 1 - Math.pow(minWinPercent * buyin / amountToSpread, 1 / tbp);
        }


        for (var i = 0; i < toBePaid - 1; ++i) {
            nextPrize = remains * decreasingParameter;
            remains -= nextPrize;
            self.prizes.push(nextPrize)
            self.prizesPercent.push(nextPrize / totPrize);
        }
        self.prizes.push(remains);
        self.prizesPercent.push(remains / totPrize);
        self.prizes.sort(function(a, b) {
            return b - a;
        });
        /*recompute prizes percents*/
        self.computePrizesPercent();
    }

    TournamentStruct.prototype.removePlayer = function(name, id) {
        var idx;
        if (!id) {

            if (!name) {
                return false;
            }

            idx = _.findIndex(this.players, function(ply) {
                return ply.name === name;
            });

        } else {
            idx = id;
        }

        this.size = this.players.length;
        return this.players.splice(idx, 1)[0];
    }

    TournamentStruct.prototype.removeNullStacks = function() {
        var self = this;
        _.forEach(self.players, function(player) {
            if (player.stack === 0) {
                self.removePlayer(player.name);
            }
        });
    }


    var version = 1.0;
    ICM.getVersion = function() {
        return version;
    }

    if (Object.freeze) {
        /*freeze them all*/
        Object.freeze(TournamentStruct);
        Object.freeze(TournamentStruct.prototype);

        Object.freeze(ICM);
    }

    return ICM;

}, this, ["lodash", "kombinatoricsJs"], this['ßøµŋđ']); /* in main app.js script (browser side only) set this['ßøµŋđ'] = 'nameSpaceToBeUsed-As-Global' if you're using nameSpaces to avoid globals */