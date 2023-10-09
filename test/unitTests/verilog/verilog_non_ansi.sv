

module dummy_module_non_ansi
  (
   A,
   B,

   C

   );


  parameter PARAM_A = 64;

  parameter PARAM_B, PARAM_C = 16;




Distractor #(
   .PARAM_A   (PARAM_A),
   .PARAM_B   (PARAM_B)
        )
Distractor2
  (
   .A      (A),
   .B   (B),
   .C      (C)
   );


endmodule
