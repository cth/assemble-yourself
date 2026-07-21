// Thin async wrapper around Tau Prolog. Exposes a single shared session that has
// the biology program loaded, plus helpers to run a goal and read variable
// bindings back as plain JavaScript values.
(function () {
  "use strict";

  var session = null;
  var ready = null;

  // Convert a Tau Prolog term into a JS value: lists become arrays, atoms and
  // numbers become their primitive value, recursively.
  function termToJs(term) {
    if (pl.type.is_number(term)) return term.value;
    if (pl.type.is_list(term) || (pl.type.is_term(term) && term.indicator === "[]/0")) {
      var arr = [];
      var t = term;
      while (t.indicator === "./2") {
        arr.push(termToJs(t.args[0]));
        t = t.args[1];
      }
      return arr;
    }
    if (pl.type.is_term(term) && term.args.length === 0) return term.id;
    if (pl.type.is_variable(term)) return null;
    // Compound term: return { functor, args }
    return { functor: term.id, args: term.args.map(termToJs) };
  }

  // Run a goal and collect every solution as an object of {VarName: jsValue}.
  function queryAll(goal) {
    return new Promise(function (resolve, reject) {
      session.query(goal, {
        success: function () {
          var results = [];
          var step = function () {
            session.answer({
              success: function (answer) {
                var row = {};
                for (var v in answer.links) {
                  if (Object.prototype.hasOwnProperty.call(answer.links, v)) {
                    row[v] = termToJs(answer.links[v]);
                  }
                }
                results.push(row);
                step();
              },
              fail: function () { resolve(results); },
              error: function (err) { reject(new Error(pl.format_answer(err))); },
              limit: function () { resolve(results); }
            });
          };
          step();
        },
        error: function (err) { reject(new Error(pl.format_answer(err))); }
      });
    });
  }

  // Run a goal and return the first solution's bindings, or null on failure.
  function queryOne(goal) {
    return queryAll(goal).then(function (rows) {
      return rows.length ? rows[0] : null;
    });
  }

  function init() {
    if (ready) return ready;
    session = pl.create(5000000);
    ready = new Promise(function (resolve, reject) {
      session.consult(window.BIOLOGY_PROLOG, {
        success: function () { resolve(); },
        error: function (err) { reject(new Error(pl.format_answer(err))); }
      });
    });
    return ready;
  }

  // Helper: build a Prolog list literal from an array of atoms, e.g. [a,t,g].
  function baseListLiteral(bases) {
    return "[" + bases.join(",") + "]";
  }

  window.Prolog = {
    init: init,
    queryAll: queryAll,
    queryOne: queryOne,
    baseListLiteral: baseListLiteral
  };
})();
