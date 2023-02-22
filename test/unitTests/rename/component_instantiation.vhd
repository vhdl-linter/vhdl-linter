entity component_instantiation is
end entity;

architecture arch of component_instantiation is

  component component_entity is
    port (
      i_clk : in integer
      );
  end component component_entity;
begin



  comp_inst : component_entity
    port map (
      i_clk => 0
      );

  ent_inst : entity work.component_entity
    port map (
      i_clk => 1
      );


end architecture;
