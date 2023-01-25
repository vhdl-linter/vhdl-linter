library ieee;
use ieee.std_logic_1164.all;
entity test_nested_generate is
end test_nested_generate;
architecture arch of test_nested_generate is

  signal a_unused : std_ulogic;
begin
  gen :
    case a_unused generate
    when a_label : '0' =>
      null;
    when b_label : '1' =>
  begin
    null;
    when c_label : 'Z' =>
    begin
      null;
    end c_label;
    when d_label : 'H' =>
    begin
      null;
    end;
    when 'L' =>
    end;
  end generate gen;
  gen2 :
  for i_unused in 0 to 5 generate
  end generate gen2;

end arch;
