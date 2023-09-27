module switch #(
  g_DEVICES,
  g_FREQUENCY,
  g_AVALON_LENGTH = 1,
  parameter logic [g_DEVICES - 1 : 0][31:0] annoying = {32'hc0a82a2a, 32'hc0a82a2b},
  parameter logic [47:0] g_TEST = 48'hDEADBEEFABBA
) (
  input i_clk,
  input longint i_portSpeed[g_DEVICES - 1 : 0],
  output logic o_txReady[g_DEVICES - 1 : 0],
  input logic [g_AVALON_LENGTH*g_DEVICES - 1 : 0] i_avalonVec,
  output logic [g_AVALON_LENGTH*g_DEVICES - 1 : 0] o_avalonVec
);
endmodule;
