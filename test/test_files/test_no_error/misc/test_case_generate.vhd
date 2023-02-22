library ieee;
use ieee.std_logic_1164.all;
entity test_nested_generate is
  generic (
    A_UNUSED : std_ulogic
    );
end test_nested_generate;
architecture arch of test_nested_generate is

begin
  gen :
    case A_UNUSED generate
    when a_label : '0' =>

    when b_label : '1' =>
  begin

    when c_label : 'Z' =>
      begin

      end c_label;
    when d_label : 'H' =>
      begin

      end;
    when 'L' =>
    when others =>
  end;
end generate gen;
gen2 :
  for i_unused in 0 to 5 generate
  end generate gen2;

  end arch;
