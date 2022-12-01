library ieee ;
  use ieee.std_logic_1164.all ;
  use ieee.numeric_std.all ;

entity test_highlight is
end test_highlight ;

architecture arch of test_highlight is
  signal foo : std_ulogic;
begin
p_test : process is

begin
foo <= '1';

end process;
end architecture ;