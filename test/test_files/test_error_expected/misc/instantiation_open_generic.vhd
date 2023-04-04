entity dummy_instantiation_open_no_default_generic is
  generic (
    foo : integer
    );
end entity;
entity instantiation_open is
end entity;
architecture arch of instantiation_open is
begin
  dummy : entity work.dummy_instantiation_open_no_default_generic
    generic map (
      foo => open -- generic without default cannot be open
      );
end architecture;
