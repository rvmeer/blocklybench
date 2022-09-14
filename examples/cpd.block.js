Blockly.Blocks['cpd'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("CPD");
    this.appendDummyInput()
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("name")
        .appendField(new Blockly.FieldTextInput("CCBB"), "name");
    this.appendDummyInput()
        .setAlign(Blockly.ALIGN_RIGHT)
        .appendField("description")
        .appendField(new Blockly.FieldTextInput("description"), "description");
    this.appendStatementInput("steps")
        .setCheck("step")
        .appendField("steps");
    this.appendStatementInput("scenarios")
        .setCheck("scenario")
        .appendField("scenarios");
    this.setColour(230);
 this.setTooltip("");
 this.setHelpUrl("");
  }
};