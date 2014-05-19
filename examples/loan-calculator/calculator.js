"use strict";

var reflex = require("../../reflex");

// Arguments reperesent cells (like in spreadsheet) that user may change. We can
// define derived cells that react to changes on cells they derived from and change
// as well.
var main = reflex(function(loan, down, price, interest, tax, hazard, other) {
  var due = reflex.lift(function(loan) {
    return loan * 12;
  }, loan);

  var downAmount = reflex.lift(function(price, down) {
    return price * down / 100;
  }, price, down);

  var loanAmount = reflex.lift(function(price, downAmount) {
    return price - downAmount;
  }, price, downAmount);

  var monthlyMortgage = reflex.lift(function(loan, interest, due) {
    return Math.round(loan * interest / (1 - (Math.pow(1 / (1 + interest), due))));
  }, loanAmount, interest, due);

  var estateTax = reflex.lift(function(tax) {
    return Math.round(tax / 12);
  }, tax);

  var sum = function() {
    var total = 0;
    var index = 0;
    while (index < arguments.length) {
      total = total + arguments[index];
      index = index + 1;
    }
    return total;
  };
  var totalMonthly = reflex.lift(sum, hazard, other, estateTax, monthlyMortgage);

  // Finally we return record of named cells. Changes on either one of them going to be reflected
  // on the rendering target. Name of the cell is assumed to be mapped to an id of the element it
  // is bound to.
  this.loan = loan;
  this.down = down;
  this.price = price;
  this.interest = interest;
  this.tax = tax;
  this.hazardInsurance = hazard;
  this.otherFinancing = other;
  this.due = due;
  this.downAmount = downAmount;
  this.loanAmount = loanAmount;
  this.monthlyMortgage = monthlyMortgage;
  this.estateTax = estateTax;
  this.totalMonthly = totalMonthly;
});

window.onload = function() {
  main.render(document.documentElement);
}


