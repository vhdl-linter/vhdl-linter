library ieee;
use ieee.std_logic_1164.all;
entity issue391 is
end entity;

architecture rtl of issue391 is
  -- dummy declarations
  function fu(v : std_ulogic) return integer is
  begin
    report to_string(v);
    return 1;
  end function;
  constant CONST : std_ulogic_vector(1 downto 0) := (others => '0');

  -- fu(CONST(0)) should be valid in type indication
  signal my_unused : std_ulogic_vector(fu(CONST(0)) - 1 downto 0);
begin  

 

end architecture;
