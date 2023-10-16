library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;

entity hiding is

end hiding;

architecture arch of hiding is
  signal foo : std_ulogic_vector(5 downto 0);  -- vhdl-linter-disable-line unused
begin
  test : process
    variable length : integer;          -- vhdl-linter-disable-line unused

  begin
    report foo'length;  -- length should not be hidden by the variable
  end process;
end architecture;
