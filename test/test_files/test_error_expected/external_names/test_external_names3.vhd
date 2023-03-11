entity dummy is
end entity;


library ieee;
use ieee.std_logic_1164.all;
entity test_external_names is
end entity;
architecture arch of test_external_names is
  alias DATA is << signal .test_toplevel.apfel : std_logic_vector(5 downto 0) >>;
begin
  process is
  begin
    report to_string( << signal .test_toplevel.apfel : std_logic_vector(5 downto 0) >> );
    report to_string( << INVALID dummy.apfel         : std_logic_vector(5 downto 0) >> );  -- invalid kind
  end process;
  dummy : entity work.dummy;
end architecture;


library ieee;
use ieee.std_logic_1164.all;
entity test_toplevel is
end entity;
architecture arch of test_toplevel is
  signal apfel : std_ulogic_vector(5 downto 0);  -- vhdl-linter-disable-line unused
begin
end architecture;
