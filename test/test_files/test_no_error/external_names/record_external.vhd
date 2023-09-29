library ieee;
use ieee.std_logic_1164.all;
package pkg_record is
  type test_record is record
    foo : std_ulogic_vector(1 downto 0);
  end record;
end package;
use work.pkg_record.all;
library ieee;
use ieee.std_logic_1164.all;

entity inner is
end entity;
architecture arch of inner is
  signal test_signal : test_record;     -- vhdl-linter-disable-line unused
begin
  test_signal.foo <= "01";
end architecture;
library ieee;
use ieee.std_logic_1164.all;
use work.pkg_record.all;
entity record_external is
end entity;
architecture arch of record_external is
begin
  inner : entity work.inner;

  process is
    alias test_alias is << signal record_external.inner.test_signal : test_record >>;
  begin
    report "Foo: " & to_hstring(test_alias.foo);
    wait;
  end process;
end architecture;
