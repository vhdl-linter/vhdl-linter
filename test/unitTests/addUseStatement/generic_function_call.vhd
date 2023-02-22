-- Based on #183

entity foo is
  generic (
    GEN : integer
    );
end entity;


entity bar is
end entity;
architecture arch of bar is


begin
  inst_foo : entity work.foo
    generic map(
      GEN => integer(ceil(4.5 * 5))
      );
end arch;
