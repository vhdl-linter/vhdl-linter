library ieee;
use ieee.std_logic_1164.all;
entity attribute_prefix is
end entity;
architecture arch of attribute_prefix is
  type slv_vector is array(natural range <>, natural range <>) of std_ulogic_vector;


  function test_function(a : integer) return integer is
  begin
    return a;
  end function;
begin
  process is
    variable dummy : slv_vector(0 to 1, 0 to 5 - 1)(24 - 1 downto 0);  -- (dut, qp)
  begin
    dummy(5, 3) := test_function(dummy'element'range);

  end process;
end architecture;
