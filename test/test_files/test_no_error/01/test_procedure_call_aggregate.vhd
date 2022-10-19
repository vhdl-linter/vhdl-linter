library ieee;
use ieee.std_logic_1164.all;
use ieee.numeric_std.all;


entity test_procedure_call is

end entity;

architecture rtl of test_procedure_call is
  constant LENGTH : integer := 32;
begin
  process
    procedure spi_write (
      constant data : in std_ulogic_vector(LENGTH - 1 downto 0) --vhdl-linter-disable-this-line
      )
    is
    begin

    end procedure;
  begin
    spi_write((LENGTH - 1 downto 0 => '1')); -- This is fine
  end process;

end architecture;
