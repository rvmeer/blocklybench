Blockly.Blocks['step'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("step")
        .appendField("name")
        .appendField(new Blockly.FieldTextInput("name"), "name");
    this.appendStatementInput("NAME")
        .setCheck("Boolean");
    this.setColour(160);
 this.setTooltip("Dit is mijn 1e blok");
 this.setHelpUrl("help");
  }
};