module test_module_parameter
#(
  parameter A = 8,
  parameter B,
  parameter C = 23
)
(
		input  wire [0:0]   in_bit
    );
endmodule;
module test_module_no_parameter
(
		input  wire [0:0]   in_bit
    );
endmodule;
