library ieee;
use ieee.numeric_std.all;
use ieee.std_logic_1164.all;
entity test_instantiation_formal_function is
end entity;
architecture arch of test_instantiation_formal_function is
  signal a, b : unresolved_unsigned(7 downto 0);  -- vhdl-linter-disable-line unused
  signal c    : integer;
  function dummy_function(
    foo : std_ulogic_vector)
    return integer is
  begin
    return to_integer(unsigned(foo));
  end function;
begin
  test_instantiation_output_dummy : entity work.test_instantiation_output_dummy
    port map (
      unsigned(test) => a
      );
  test_instantiation_output_dummy2 : entity work.test_instantiation_output_dummy
    port map (
      u_unsigned(test) => b
      );
  inst_test_instantiation_output_dummy : entity work.test_instantiation_output_dummy
    port map(
      dummy_function(test) => c
      );
      assert true report integer'image(c);
end architecture;
