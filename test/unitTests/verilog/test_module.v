module test_module
#(
  parameter WIDTH = 8
)
(
		input  wire [0:0]   in_bit,
		output wire [0:0]   out_bit, // test comment
    input  wire in_bit_2,
    output wire out_bit_2,
    output wire [WIDTH - 1:0] out_byte_2,
    input  wire [WIDTH - 1:0] in_byte_2);
endmodule;
// For regression testing this file has to be larger than 512 Byte
////////////////////////////////////////////////////////////////////////////////////////////////// long enough?
////////////////////////////////////////////////////////////////////////////////////////////////// now long enough!